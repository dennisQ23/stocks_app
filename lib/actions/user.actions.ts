"use server";

import { connectToDatabase } from "@/database/mongoose";

export const getAllUsersForNewsEmail = async (): Promise<
  { id: string; email: string; name: string }[]
> => {
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Mongoose connection not connected");

    const users = await db
      .collection("users")
      .find(
        { email: { $exists: true, $ne: null } },
        {
          projection: {
            _id: 1,
            id: 1,
            email: 1,
            name: { $exists: true, $ne: null },
          },
        }
      )
      .toArray();

    return users
      .filter((user) => user.id && user._id)
      .map((user) => ({
        id: user.id || user._id!.toString(),
        email: user.email,
        name: user.name,
      }));
  } catch (e) {
    console.error("Error fetching users for news email", e);
    return [];
  }
};
