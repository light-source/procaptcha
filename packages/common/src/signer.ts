// Copyright 2017-2023 @polkadot/react-signer authors & contributors
// SPDX-License-Identifier: Apache-2.0
import { objectSpread } from '@polkadot/util/object'
import type { KeyringPair } from '@polkadot/keyring/types'
import type { Registry, SignerPayloadJSON } from '@polkadot/types/types'
import type { Signer, SignerResult } from '@polkadot/api/types'

let id = 0

export default class AccountSigner implements Signer {
    readonly #keyringPair: KeyringPair
    readonly #registry: Registry

    constructor(registry: Registry, keyringPair: KeyringPair) {
        this.#keyringPair = keyringPair
        this.#registry = registry
    }

    public async signPayload(payload: SignerPayloadJSON): Promise<SignerResult> {
        return new Promise((resolve): void => {
            const signed = this.#registry
                .createType('ExtrinsicPayload', payload, { version: payload.version })
                .sign(this.#keyringPair)

            resolve(objectSpread({ id: ++id }, signed))
        })
    }
}
