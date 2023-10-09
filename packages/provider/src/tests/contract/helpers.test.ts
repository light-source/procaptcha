// Copyright 2021-2023 Prosopo (UK) Ltd.
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
import { AbiMessage, DecodedMessage } from '@polkadot/api-contract/types'
import { BN, hexToU8a } from '@polkadot/util'
import { ContractSelector } from '@polkadot/types/interfaces'
import { KeypairType } from '@polkadot/util-crypto/types'
import { LogLevel, ProsopoEnvError, getLogger, getPair } from '@prosopo/common'
import { MockEnvironment } from '@prosopo/env'
import { ReturnNumber } from '@727-ventures/typechain-types'
import { TypeDefInfo } from '@polkadot/types-create'
import { ViteTestContext } from '@prosopo/env'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { at } from '@prosopo/util'
import { encodeStringArgs, wrapQuery } from '@prosopo/contract'
import { testConfig } from '@prosopo/config'

declare module 'vitest' {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface TestContext extends ViteTestContext {}
}

describe('CONTRACT HELPERS', function () {
    const log = getLogger(LogLevel.enum.info, 'TEST')

    beforeEach(async function (context) {
        context.ss58Format = 42
        context.pairType = 'sr25519' as KeypairType
        const alicePair = await getPair(context.pairType, context.ss58Format, '//Alice')
        console.log(testConfig)
        context.env = new MockEnvironment(alicePair, testConfig)
        try {
            await context.env.isReady()
        } catch (e) {
            // TODO fix error handling
            throw new ProsopoEnvError(e as Error)
        }
        const promiseStakeDefault: Promise<ReturnNumber> = wrapQuery(
            context.env.getContractInterface().query.getProviderStakeThreshold,
            context.env.getContractInterface().query
        )()
        context.providerStakeThreshold = new BN((await promiseStakeDefault).toNumber())
    })

    afterEach(async ({ env }): Promise<void> => {
        if (env && 'db' in env) await env.db?.close()
    })

    test('Properly encodes `Hash` arguments when passed unhashed', async function ({ env }) {
        try {
            log.info('env ready')
            const args = ['https://localhost:9229']
            const methodObj = {
                args: [{ type: { type: 'Hash', info: TypeDefInfo.UInt }, name: '' }],
                docs: [],
                fromU8a: function (): DecodedMessage {
                    return {} as DecodedMessage
                },
                identifier: '',
                index: 0,
                method: '',
                path: [''],
                selector: hexToU8a('0x42b45efa') as ContractSelector,
                toU8a: function (): any {
                    return {} as AbiMessage
                },
            }
            expect(at(encodeStringArgs(env.getContractInterface().abi, methodObj, args), 0).toString()).to.equal(
                hexToU8a('0x0000000000000000000068747470733a2f2f6c6f63616c686f73743a39323239').toString()
            )
            log.info('end of test')
        } catch (e) {
            throw new Error(String(e))
        }
    })
})