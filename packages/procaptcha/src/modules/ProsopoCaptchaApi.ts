// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo/procaptcha>.
//
// procaptcha is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha.  If not, see <http://www.gnu.org/licenses/>.
import { randomAsHex } from '@polkadot/util-crypto'
import { CaptchaMerkleTree, CaptchaSolution, CaptchaSolutionCommitment, verifyProof } from '@prosopo/datasets'
import { Signer } from '@polkadot/api/types'

import { CaptchaSolutionResponse, GetCaptchaResponse, ProsopoRandomProviderResponse } from '../types/api'
import { TransactionResponse } from '../types/contract'

import { ProviderApi } from '@prosopo/api'
import ProsopoContract from '../api/ProsopoContract'
import { TCaptchaSubmitResult } from '../types/client'
import { ProsopoApiError } from '../api/handlers'
import { ProsopoEnvError } from '@prosopo/datasets'
import { computeCaptchaSolutionHash } from '@prosopo/datasets'

export type SubmitFunction =
    | typeof ProsopoCaptchaApi.prototype.submitCaptchaSolutionWeb3
    | typeof ProsopoCaptchaApi.prototype.submitCaptchaSolutionWeb2

export class ProsopoCaptchaApi {
    protected userAccount: string
    protected contract: ProsopoContract
    protected provider: ProsopoRandomProviderResponse
    protected providerApi: ProviderApi
    protected submitCaptchaFn: SubmitFunction

    constructor(
        userAccount: string,
        contract: ProsopoContract,
        provider: ProsopoRandomProviderResponse,
        providerApi: ProviderApi,
        web2: boolean
    ) {
        this.userAccount = userAccount
        this.contract = contract
        this.provider = provider
        this.providerApi = providerApi
        this.submitCaptchaFn = web2 ? this.submitCaptchaSolutionWeb2 : this.submitCaptchaSolutionWeb3
    }

    public async getCaptchaChallenge(): Promise<GetCaptchaResponse> {
        const captchaChallenge: GetCaptchaResponse = await this.providerApi.getCaptchaChallenge(this.userAccount, this.provider)
        this.verifyCaptchaChallengeContent(this.provider, captchaChallenge)
        return captchaChallenge
    }

    public verifyCaptchaChallengeContent(
        provider: ProsopoRandomProviderResponse,
        captchaChallenge: GetCaptchaResponse
    ): void {
        // TODO make sure root is equal to root on the provider
        const proofLength = captchaChallenge.captchas[0].proof.length
        console.log(provider.provider)
        console.log(provider.provider.datasetIdContent, captchaChallenge.captchas[0].proof[proofLength - 1][0])
        if (provider.provider.datasetIdContent !== captchaChallenge.captchas[0].proof[proofLength - 1][0]) {
            throw new ProsopoEnvError('CAPTCHA.INVALID_DATASET_CONTENT_ID')
        }

        for (const captchaWithProof of captchaChallenge.captchas) {
            if (!verifyProof(captchaWithProof.captcha.captchaContentId, captchaWithProof.proof)) {
                throw new ProsopoEnvError('CAPTCHA.INVALID_CAPTCHA_CHALLENGE')
            }
        }
        console.log('CAPTCHA.CHALLENGE_VERIFIED')
        return
    }

    public async submitCaptchaSolution(
        signer: Signer,
        requestHash: string,
        datasetId: string,
        solutions: CaptchaSolution[]
    ): Promise<TCaptchaSubmitResult> {
        return this.submitCaptchaFn(signer, requestHash, datasetId, solutions)
    }

    async submitCaptchaSolutionWeb2(
        signer: Signer,
        requestHash: string,
        datasetId: string,
        solutions: CaptchaSolution[]
    ): Promise<TCaptchaSubmitResult> {
        const salt = randomAsHex()
        const tree = new CaptchaMerkleTree()
        const captchaSolutionsSalted: CaptchaSolution[] = solutions.map((captcha) => ({
            ...captcha,
            salt,
        }))
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash

        let result: CaptchaSolutionResponse

        try {
            result = await this.providerApi.submitCaptchaSolution(
                captchaSolutionsSalted,
                requestHash,
                this.contract.userAccountAddress,
                salt,
                undefined,
                undefined,
                true
            )
        } catch (err) {
            throw new ProsopoApiError(err)
        }
        return [result, commitmentId, undefined, undefined]
    }

    public async submitCaptchaSolutionWeb3(
        signer: Signer,
        requestHash: string,
        datasetId: string,
        solutions: CaptchaSolution[]
    ): Promise<TCaptchaSubmitResult> {
        const salt = randomAsHex()
        const tree = new CaptchaMerkleTree()
        const captchaSolutionsSalted: CaptchaSolution[] = solutions.map((captcha) => ({
            ...captcha,
            salt,
        }))
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha))

        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash

        console.log('solveCaptchaChallenge commitmentId', commitmentId)
        // console.log("solveCaptchaChallenge USER ACCOUNT", this.contract.getAccount().address);
        // console.log("solveCaptchaChallenge DAPP ACCOUNT", this.contract.getDappAddress());
        // console.log("solveCaptchaChallenge CONTRACT ADDRESS", this.contract.getContract().address.toString());

        let tx: TransactionResponse

        try {
            tx = await this.contract.dappUserCommit(signer, datasetId as string, commitmentId, this.provider.providerId)
        } catch (err) {
            throw new ProsopoEnvError(err)
        }

        let result: CaptchaSolutionResponse

        try {
            result = await this.providerApi.submitCaptchaSolution(
                captchaSolutionsSalted,
                requestHash,
                this.contract.userAccountAddress,
                salt,
                tx.blockHash!,
                tx.txHash.toString()
            )
        } catch (err) {
            throw new ProsopoApiError(err)
        }

        let commitment: CaptchaSolutionCommitment

        try {
            commitment = await this.contract.getCaptchaSolutionCommitment(commitmentId)
        } catch (err) {
            throw new ProsopoEnvError(err)
        }

        return [result, commitmentId, tx, commitment]
    }
}

export default ProsopoCaptchaApi
