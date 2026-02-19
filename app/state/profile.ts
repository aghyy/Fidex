"use client";

import { atom } from "jotai";

export type UserProfile = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  image: string;
  isOAuthUser: boolean;
  theme?: "light" | "dark" | "system";
  bookAllTransactions?: boolean;
};

export const profileLoadedAtom = atom(false);

export const profileAtom = atom<UserProfile | null>(null);


