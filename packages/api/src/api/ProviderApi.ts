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
import {
	ApiParams,
	ApiPaths,
	type CaptchaResponseBody,
	type CaptchaSolution,
	CaptchaSolutionBody,
	type CaptchaSolutionBodyType,
	type CaptchaSolutionResponse,
	type GetPowCaptchaChallengeRequestBodyType,
	type GetPowCaptchaResponse,
	type ImageVerificationResponse,
	type NetworkConfig,
	type PowCaptchaSolutionResponse,
	type ProcaptchaToken,
	type Provider,
	type ProviderRegistered,
	type RandomProvider,
	type ServerPowCaptchaVerifyRequestBodyType,
	type StoredEvents,
	SubmitPowCaptchaSolutionBody,
	type VerificationResponse,
	type VerifySolutionBodyTypeInput,
} from "@prosopo/types";
import HttpClientBase from "./HttpClientBase.js";

export default class ProviderApi extends HttpClientBase implements ProviderApi {
	private network: NetworkConfig;
	private account: string;

	constructor(network: NetworkConfig, providerUrl: string, account: string) {
		const providerUrlWithProtocol = !providerUrl.startsWith("http")
			? `https://${providerUrl}`
			: providerUrl;
		super(providerUrlWithProtocol);
		this.network = network;
		this.account = account;
	}

	public getCaptchaChallenge(
		userAccount: string,
		randomProvider: RandomProvider,
	): Promise<CaptchaResponseBody> {
		const { provider, blockNumber } = randomProvider;
		const dappAccount = this.account;
		const url = `${ApiPaths.GetImageCaptchaChallenge}/${
			provider.datasetId
		}/${userAccount}/${dappAccount}/${blockNumber.toString().replace(/,/g, "")}`;
		return this.fetch(url);
	}

	public submitCaptchaSolution(
		captchas: CaptchaSolution[],
		requestHash: string,
		userAccount: string,
		salt: string,
		timestamp: string,
		providerTimestampSignature: string,
		userRequestHashSignature: string,
	): Promise<CaptchaSolutionResponse> {
		const captchaSolutionBody: CaptchaSolutionBodyType =
			CaptchaSolutionBody.parse({
				captchas,
				requestHash,
				[ApiParams.user]: userAccount,
				[ApiParams.dapp]: this.account,
				salt,
				[ApiParams.timestamp]: timestamp,
				[ApiParams.signature]: {
					[ApiParams.user]: {
						[ApiParams.requestHash]: userRequestHashSignature,
					},
					[ApiParams.provider]: {
						[ApiParams.timestamp]: providerTimestampSignature,
					},
				},
			});
		return this.post(ApiPaths.SubmitImageCaptchaSolution, captchaSolutionBody);
	}

	public verifyDappUser(
		token: ProcaptchaToken,
		dappUserSignature: string,
		maxVerifiedTime?: number,
	): Promise<ImageVerificationResponse> {
		const payload: VerifySolutionBodyTypeInput = {
			[ApiParams.token]: token,
			[ApiParams.dappUserSignature]: dappUserSignature,
		};
		if (maxVerifiedTime) {
			payload[ApiParams.maxVerifiedTime] = maxVerifiedTime;
		}

		return this.post(ApiPaths.VerifyImageCaptchaSolutionDapp, payload);
	}

	public verifyUser(
		token: ProcaptchaToken,
		dappUserSignature: string,
		maxVerifiedTime?: number,
	): Promise<ImageVerificationResponse> {
		const payload: VerifySolutionBodyTypeInput = {
			[ApiParams.token]: token,
			[ApiParams.dappUserSignature]: dappUserSignature,
			...(maxVerifiedTime && { [ApiParams.maxVerifiedTime]: maxVerifiedTime }),
		};

		return this.post(ApiPaths.VerifyImageCaptchaSolutionUser, payload);
	}

	public getPowCaptchaChallenge(
		user: string,
		dapp: string,
	): Promise<GetPowCaptchaResponse> {
		const body: GetPowCaptchaChallengeRequestBodyType = {
			[ApiParams.user]: user.toString(),
			[ApiParams.dapp]: dapp.toString(),
		};
		return this.post(ApiPaths.GetPowCaptchaChallenge, body);
	}

	public submitPowCaptchaSolution(
		challenge: GetPowCaptchaResponse,
		userAccount: string,
		dappAccount: string,
		nonce: number,
		userTimestampSignature: string,
		timeout?: number,
	): Promise<PowCaptchaSolutionResponse> {
		const body = SubmitPowCaptchaSolutionBody.parse({
			[ApiParams.challenge]: challenge.challenge,
			[ApiParams.difficulty]: challenge.difficulty,
			[ApiParams.timestamp]: challenge.timestamp,
			[ApiParams.user]: userAccount.toString(),
			[ApiParams.dapp]: dappAccount.toString(),
			[ApiParams.nonce]: nonce,
			[ApiParams.verifiedTimeout]: timeout,
			[ApiParams.signature]: {
				[ApiParams.provider]:
					challenge[ApiParams.signature][ApiParams.provider],
				[ApiParams.user]: {
					[ApiParams.timestamp]: userTimestampSignature,
				},
			},
		});
		return this.post(ApiPaths.SubmitPowCaptchaSolution, body);
	}

	public submitUserEvents(events: StoredEvents, string: string) {
		return this.post(ApiPaths.SubmitUserEvents, { events, string });
	}

	public getProviderStatus(): Promise<ProviderRegistered> {
		return this.fetch(ApiPaths.GetProviderStatus);
	}

	public getProviderDetails(): Promise<Provider> {
		return this.fetch(ApiPaths.GetProviderDetails);
	}

	public submitPowCaptchaVerify(
		token: string,
		signatureHex: string,
		recencyLimit: number,
	): Promise<VerificationResponse> {
		const body: ServerPowCaptchaVerifyRequestBodyType = {
			[ApiParams.token]: token,
			[ApiParams.dappSignature]: signatureHex,
			[ApiParams.verifiedTimeout]: recencyLimit,
		};
		return this.post(ApiPaths.VerifyPowCaptchaSolution, body);
	}
}
