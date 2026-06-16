import mongoose from "mongoose";

import { getMongoUri } from "../config/env.js";

let connected = false;

export async function connectMongo(): Promise<void> {
	if (connected) return;
	await mongoose.connect(getMongoUri());
	connected = true;
}

export async function disconnectMongo(): Promise<void> {
	if (!connected) return;
	await mongoose.disconnect();
	connected = false;
}
