import { z } from "zod";
import { authed } from "../middleware/auth";
import { CATALOG_IDS } from "../../web/game/robots";
import * as s from "../social/service";

const scope = z.enum(["global", "guild"]);
const text = z.string().trim().min(1).max(200);
const id = z.string().min(1).max(120);
const robot = z.string().refine(v => CATALOG_IDS.includes(v), "Robô não encontrado.");
export const social = {
  me: authed.handler(({ context }) => s.publish(context.user, {})),
  profile: authed.input(z.object({ id })).handler(({ input }) => s.publicProfile(input.id)),
  publish: authed.input(z.object({ name: z.string().trim().min(2).max(24).optional(), title: z.string().trim().max(30).optional(), bio: z.string().trim().max(140).optional(), avatar: robot.or(z.literal("")).optional(), showcase: z.array(robot).max(4).optional(), level: z.number().int().min(1).max(9999).optional(), robots: z.number().int().min(0).max(10000).optional() })).handler(({ input, context }) => s.publish(context.user, input)),
  search: authed.input(z.object({ term: z.string().trim().max(40) })).handler(({ input, context }) => s.directory(context.user, input.term)),
  chat: authed.input(z.object({ scope })).handler(({ input, context }) => s.messages(context.user, input.scope)),
  send: authed.input(z.object({ scope, text })).handler(({ input, context }) => s.send(context.user, input.scope, input.text)),
  inbox: authed.handler(({ context }) => s.inbox(context.user)),
  thread: authed.input(z.object({ id })).handler(({ input, context }) => s.thread(context.user, input.id)),
  dm: authed.input(z.object({ id, text })).handler(({ input, context }) => s.dm(context.user, input.id, input.text)),
  block: authed.input(z.object({ id, active: z.boolean() })).handler(({ input, context }) => s.block(context.user, input.id, input.active)),
  blocked: authed.input(z.object({ id })).handler(({ input, context }) => s.blocked(context.user, input.id)),
};
