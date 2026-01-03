"use server";

import { connectToDatabase } from "@/database/mongoose";
import Watchlist from "@/database/models/watchlist.model";

/**
 * Retrieve the watchlist symbols for the user with the given email.
 *
 * @param email - The user's email address to look up
 * @returns An array of watchlist symbol strings for the user; empty array if the user is not found or an error occurs
 */
export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) {
      console.error("Mongoose connection not connected");
      return []
    }

    // Find the user by email in the user collection (Better Auth)
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return [];
    }

    // If found, query the Watchlist by userId, return just the symbols as strings.
    const watchlist = await Watchlist.find({ userId: user.id || user._id.toString() });
    return watchlist.map((item) => item.symbol);
  } catch (error) {
    console.error("Error fetching watchlist symbols by email:", error);
    return [];
  }
}