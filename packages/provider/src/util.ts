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
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto/address";
import { hexToU8a } from "@polkadot/util/hex";
import { isHex } from "@polkadot/util/is";
import { ProsopoContractError, ProsopoEnvError } from "@prosopo/common";
import { type ScheduledTaskNames, ScheduledTaskStatus } from "@prosopo/types";
import type { IDatabase, IProviderDatabase } from "@prosopo/types-database";
import { at } from "@prosopo/util";
import { Address4, Address6 } from "ip-address";

export function encodeStringAddress(address: string) {
	try {
		return encodeAddress(
			isHex(address) ? hexToU8a(address) : decodeAddress(address),
		);
	} catch (err) {
		throw new ProsopoContractError("CONTRACT.INVALID_ADDRESS", {
			context: { address },
		});
	}
}

export function shuffleArray<T>(array: T[]): T[] {
	for (let arrayIndex = array.length - 1; arrayIndex > 0; arrayIndex--) {
		const randIndex = Math.floor(Math.random() * (arrayIndex + 1));
		const tmp = at(array, randIndex);
		array[randIndex] = at(array, arrayIndex);
		array[arrayIndex] = tmp;
	}
	return array;
}

/**
 * Check if there is a scheduled task running.
 * If the scheduled task is running and not completed, return true.
 * If the scheduled task is running and completed, return false.
 * Otherwise, the scheduled task is not running, return false.
 */
export async function checkIfTaskIsRunning(
	taskName: ScheduledTaskNames,
	db: IProviderDatabase,
): Promise<boolean> {
	const runningTask = await db.getLastScheduledTaskStatus(
		taskName,
		ScheduledTaskStatus.Running,
	);
	if (runningTask) {
		const completedTask = await db.getScheduledTaskStatus(
			runningTask.id,
			ScheduledTaskStatus.Completed,
		);
		return !completedTask;
	}
	return false;
}

export const getIPAddress = (ipAddressString: string) => {
	try {
		if (ipAddressString.match(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/)) {
			return new Address4(ipAddressString);
		}
		return new Address6(ipAddressString);
	} catch (e) {
		throw new ProsopoEnvError("API.INVALID_IP");
	}
};
