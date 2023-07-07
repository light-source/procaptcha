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
import { ProviderEnvironment } from '@prosopo/env'
import { Tasks } from '@prosopo/provider'
import { defaultConfig, getPairType, getSs58Format } from '@prosopo/cli'
import { getPair } from '@prosopo/common'
import dotenv from 'dotenv'

dotenv.config()

async function main() {
    const pair = await getPair(getPairType(), getSs58Format(), '//Alice')
    const env = new ProviderEnvironment(pair, defaultConfig())
    await env.isReady()
    const tasks = new Tasks(env)
    const dappAccounts = await tasks.contract['dappAccounts']()
    console.log(dappAccounts.toHuman())
    process.exit()
}

main().catch((error) => {
    console.error(error)
    process.exit()
})
