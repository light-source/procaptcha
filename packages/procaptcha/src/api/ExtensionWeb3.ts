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
import { Account, ProcaptchaClientConfigOutput } from '@prosopo/types'
import { AccountNotFoundError, ExtensionNotFoundError } from './errors.js'
import { InjectedExtension } from '@polkadot/extension-inject/types'
import { web3Enable } from '@polkadot/extension-dapp'
import Extension from './Extension.js'

/**
 * Class for interfacing with web3 accounts.
 */
export default class ExtWeb3 extends Extension {
    public async getAccount(config: ProcaptchaClientConfigOutput): Promise<Account> {
        const { dappName, userAccountAddress: address } = config

        if (!address) {
            throw new AccountNotFoundError('No account address provided')
        }

        // enable access to all extensions
        const extensions: InjectedExtension[] = await web3Enable(dappName)
        if (extensions.length === 0) {
            throw new ExtensionNotFoundError()
        }

        // search through all extensions for the one that has the account
        for (const extension of extensions) {
            const accounts = await extension.accounts.get()
            const account = accounts.find((account) => account.address === address)
            if (account) {
                return { account, extension }
            }
        }

        throw new AccountNotFoundError('No account found matching ' + address)
    }
}
