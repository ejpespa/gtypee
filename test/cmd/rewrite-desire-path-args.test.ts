import { describe, expect, it } from "vitest";

import { rewriteDesirePathArgs } from "../../src/cmd/rewrite-desire-path-args.js";

describe("rewriteDesirePathArgs", () => {
  it("rewrites --fields to --select for non-calendar-events commands", () => {
    const args = ["drive", "search", "--fields", "id,name"];
    expect(rewriteDesirePathArgs(args)).toEqual(["drive", "search", "--select", "id,name"]);
  });

  it("rewrites --fields=value to --select=value", () => {
    const args = ["gmail", "search", "--fields=id,threadId"];
    expect(rewriteDesirePathArgs(args)).toEqual(["gmail", "search", "--select=id,threadId"]);
  });

  it("does not rewrite --fields for calendar events", () => {
    const args = ["calendar", "events", "--fields", "items(id)"];
    expect(rewriteDesirePathArgs(args)).toEqual(args);
  });

  it("does not rewrite --fields for cal ls alias", () => {
    const args = ["cal", "ls", "--fields=items(id)"];
    expect(rewriteDesirePathArgs(args)).toEqual(args);
  });
});
