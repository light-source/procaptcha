import { stringToU8a, u8aToHex } from "@polkadot/util";
import { getPairAsync } from "@prosopo/contract";
import { datasetWithSolutionHashes } from "@prosopo/datasets";
import {
	ApiParams,
	ApiPaths,
	type Captcha,
	type CaptchaResponseBody,
	type CaptchaSolutionResponse,
} from "@prosopo/types";
import fetch from "node-fetch";
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
import { describe, expect, it } from "vitest";
import { dummyUserAccount } from "./mocks/solvedTestCaptchas.js";

const solutions = datasetWithSolutionHashes;

const baseUrl = "http://localhost:9229";

const getSolvedCaptchas = (
	captchas: Captcha[],
	solutions: typeof datasetWithSolutionHashes.captchas,
) =>
	captchas.map((captcha) => {
		const solvedCaptcha = solutions.find(
			(solvedCaptcha) =>
				solvedCaptcha.captchaContentId === captcha.captchaContentId,
		);
		if (!solvedCaptcha || !solvedCaptcha.solution) {
			throw new Error("Solution not found for captcha");
		}

		return {
			captchaContentId: captcha.captchaContentId,
			captchaId: captcha.captchaId,
			salt: solvedCaptcha.salt,
			solution: solvedCaptcha.solution,
		};
	});

describe("Image Captcha Integration Tests", () => {
	describe("GetImageCaptchaChallenge", () => {
		it("should supply an image captcha challenge to a Dapp User", async () => {
			const userAccount = "5EquBjgKx98VFyP9xVYeAUE2soNGBUbru7L9pXgdmSmrDrQp";
			const dappAccount = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw";
			const origin = "http://localhost";

			const response = await fetch(
				`${baseUrl}${ApiPaths.GetImageCaptchaChallenge}/${solutions.datasetId}/${userAccount}/${dappAccount}/0`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Origin: origin,
					},
				},
			);

			expect(response.status).toBe(200);
		});
		it("should fail if datasetID is incorrect", async () => {
			const userAccount = "5EquBjgKx98VFyP9xVYeAUE2soNGBUbru7L9pXgdmSmrDrQp";
			const dappAccount = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw";

			const response = await fetch(
				`${baseUrl}${ApiPaths.GetImageCaptchaChallenge}/"thewrongdsetId"/${userAccount}/${dappAccount}/0`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			expect(response.status).toBe(400);
		});
	});
	describe("SubmitImageCaptchaSolution", () => {
		it("should verify a correctly completed PoW captcha as true", async () => {
			const pair = await getPairAsync(
				undefined,
				dummyUserAccount.seed,
				undefined,
				"sr25519",
				42,
			);

			const userAccount = dummyUserAccount.address;
			const dappAccount = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw";
			const origin = "http://localhost";

			const response = await fetch(
				`${baseUrl}${ApiPaths.GetImageCaptchaChallenge}/${solutions.datasetId}/${userAccount}/${dappAccount}/0`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Origin: origin,
					},
				},
			);

			expect(response.status).toBe(200);

			const data = (await response.json()) as CaptchaResponseBody;

			const solvedCaptchas = datasetWithSolutionHashes.captchas.map(
				(captcha) => ({
					captchaContentId: captcha.captchaContentId,
					solution: captcha.solution,
					salt: captcha.salt,
				}),
			);

			const temp = data.captchas.map((captcha) => {
				const solvedCaptcha = solvedCaptchas.find(
					(solvedCaptcha) =>
						solvedCaptcha.captchaContentId === captcha.captchaContentId,
				);
				if (!solvedCaptcha || !solvedCaptcha.solution) {
					throw new Error("wtf?");
				}

				return {
					captchaContentId: captcha.captchaContentId,
					captchaId: captcha.captchaId,
					salt: solvedCaptcha.salt,
					solution: solvedCaptcha.solution,
				};
			});

			const body = {
				captchas: temp,
				dapp: dappAccount,
				requestHash: data.requestHash,
				signature: u8aToHex(pair.sign(stringToU8a(data.requestHash))),
				timestampSignature:
					data[ApiParams.signature][ApiParams.provider][ApiParams.timestamp],
				timestamp: data.timestamp,
				user: userAccount,
			};

			const solveThatCaptcha = await fetch(
				`${baseUrl}${ApiPaths.SubmitImageCaptchaSolution}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Origin: origin,
					},
					body: JSON.stringify(body),
				},
			);

			const res = (await solveThatCaptcha.json()) as CaptchaSolutionResponse;
			expect(res.status).toBe("You correctly answered the captchas");
		});
	});
});
