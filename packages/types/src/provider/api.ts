// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { ApiParams } from '../api/params.js'
import { CaptchaSolutionSchema, CaptchaWithProof } from '../datasets/index.js'
import { DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED, DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT } from '../config/index.js'
import { Hash, Provider } from '@prosopo/captcha-contract/types-returns'
import { ProcaptchaTokenSpec } from '../procaptcha/index.js'
import { array, input, number, object, output, string, infer as zInfer } from 'zod'

export enum ApiPaths {
    GetImageCaptchaChallenge = '/v1/prosopo/provider/captcha/image',
    GetPowCaptchaChallenge = '/v1/prosopo/provider/captcha/pow',
    SubmitImageCaptchaSolution = '/v1/prosopo/provider/solution',
    SubmitPowCaptchaSolution = '/v1/prosopo/provider/pow/solution',
    VerifyPowCaptchaSolution = '/v1/prosopo/provider/pow/verify',
    VerifyImageCaptchaSolutionDapp = `/v1/prosopo/provider/image/${ApiParams.dapp}/verify`,
    VerifyImageCaptchaSolutionUser = `/v1/prosopo/provider/image/${ApiParams.user}/verify`,
    GetProviderStatus = '/v1/prosopo/provider/status',
    GetProviderDetails = '/v1/prosopo/provider/details',
    SubmitUserEvents = '/v1/prosopo/provider/events',
}

export enum AdminApiPaths {
    BatchCommit = '/v1/prosopo/provider/admin/batch',
    UpdateDataset = '/v1/prosopo/provider/admin/dataset',
    ProviderDeregister = '/v1/prosopo/provider/admin/deregister',
    ProviderUpdate = '/v1/prosopo/provider/admin/update',
}

export interface DappUserSolutionResult {
    [ApiParams.captchas]: CaptchaIdAndProof[]
    partialFee?: string
    [ApiParams.verified]: boolean
}

export interface CaptchaSolutionResponse extends DappUserSolutionResult {
    [ApiParams.status]: string
}

export interface CaptchaIdAndProof {
    captchaId: string
    proof: string[][]
}

export const CaptchaRequestBody = object({
    [ApiParams.user]: string(),
    [ApiParams.dapp]: string(),
    [ApiParams.datasetId]: string(),
    [ApiParams.blockNumber]: string(),
})

export type CaptchaRequestBodyType = zInfer<typeof CaptchaRequestBody>

export type CaptchaResponseBody = {
    [ApiParams.captchas]: CaptchaWithProof[]
    [ApiParams.requestHash]: string
}

export const CaptchaSolutionBody = object({
    [ApiParams.user]: string(),
    [ApiParams.dapp]: string(),
    [ApiParams.captchas]: array(CaptchaSolutionSchema),
    [ApiParams.requestHash]: string(),
    [ApiParams.signature]: string(), // the signature to prove account ownership
})

export type CaptchaSolutionBodyType = zInfer<typeof CaptchaSolutionBody>

export const VerifySolutionBody = object({
    [ApiParams.token]: ProcaptchaTokenSpec,
    [ApiParams.dappUserSignature]: string(),
    [ApiParams.maxVerifiedTime]: number().optional().default(DEFAULT_IMAGE_MAX_VERIFIED_TIME_CACHED),
})

export type VerifySolutionBodyTypeInput = input<typeof VerifySolutionBody>
export type VerifySolutionBodyTypeOutput = output<typeof VerifySolutionBody>

export interface PendingCaptchaRequest {
    accountId: string
    pending: boolean
    salt: string
    [ApiParams.requestHash]: string
    deadlineTimestamp: number // unix timestamp
    requestedAtBlock: number // expected block number
}

export interface ProviderRegistered {
    status: 'Registered' | 'Unregistered'
}

export interface ProviderDetails {
    provider: Provider
    dbConnectionOk: boolean
}

export interface VerificationResponse {
    [ApiParams.status]: string
    [ApiParams.verified]: boolean
}

export interface ImageVerificationResponse extends VerificationResponse {
    [ApiParams.commitmentId]: Hash
    // The block at which the captcha was requested
    [ApiParams.blockNumber]: number
}

export interface GetPowCaptchaResponse {
    [ApiParams.challenge]: string
    [ApiParams.difficulty]: number
    [ApiParams.signature]: string
}

export interface PowCaptchaSolutionResponse {
    [ApiParams.verified]: boolean
}

/**
 * Request body for the server to verify a PoW captcha solution
 * @param {string} token - The Procaptcha token
 * @param {string} dappUserSignature - The signature proving ownership of the site key
 * @param {number} verifiedTimeout - The maximum time in milliseconds since the Provider was selected at `blockNumber`
 */
export const ServerPowCaptchaVerifyRequestBody = object({
    [ApiParams.token]: ProcaptchaTokenSpec,
    [ApiParams.dappSignature]: string(),
    [ApiParams.verifiedTimeout]: number().optional().default(DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT),
})

export const GetPowCaptchaChallengeRequestBody = object({
    [ApiParams.user]: string(),
    [ApiParams.dapp]: string(),
})

export type GetPowCaptchaChallengeRequestBodyType = zInfer<typeof GetPowCaptchaChallengeRequestBody>

export type ServerPowCaptchaVerifyRequestBodyType = zInfer<typeof ServerPowCaptchaVerifyRequestBody>

export const SubmitPowCaptchaSolutionBody = object({
    [ApiParams.blockNumber]: number(),
    [ApiParams.challenge]: string(),
    [ApiParams.difficulty]: number(),
    [ApiParams.signature]: string(),
    [ApiParams.user]: string(),
    [ApiParams.dapp]: string(),
    [ApiParams.nonce]: number(),
    [ApiParams.verifiedTimeout]: number().optional().default(DEFAULT_POW_CAPTCHA_VERIFIED_TIMEOUT),
})

export type SubmitPowCaptchaSolutionBodyType = zInfer<typeof SubmitPowCaptchaSolutionBody>
