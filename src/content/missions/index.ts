/**
 * Every mission on the site, in flight order. Add each new mission file here.
 */
import type { Mission } from "../types";
import { apollo11 } from "./apollo-11";

export { apollo11 };

export const missions: readonly Mission[] = [apollo11];
