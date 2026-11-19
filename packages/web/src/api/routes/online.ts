import { z } from "zod";
import { authed } from "../middleware/auth";
import * as service from "../online/service";
import * as rooms from "../online/rooms";

const team = z.array(z.string().max(50)).min(1).max(4);
const id = z.string().uuid();
const robot = z.string().max(50);
const room = z.string().regex(/^[A-Fa-f0-9]{6}$/);
const action = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("skill"), skillId: z.string().max(100), targetUid: z.string().max(20).optional() }).strict(),
  z.object({ kind: z.literal("ultimate"), targetUid: z.string().max(20).optional() }).strict(),
  z.object({ kind: z.literal("analyze"), targetUid: z.string().max(20).optional() }).strict(),
  z.object({ kind: z.literal("guard") }).strict(),
  z.object({ kind: z.literal("dodge") }).strict(),
  z.object({ kind: z.literal("pass") }).strict(),
  z.object({ kind: z.literal("reposition"), withUid: z.string().max(20) }).strict(),
  z.object({ kind: z.literal("cover"), withUid: z.string().max(20) }).strict(),
]);
export const online = {
  lobby: authed.handler(({ context }) => service.lobby(context.user)),
  queue: authed.input(z.object({ team, privateRoom: z.boolean(), ranked: z.boolean().optional() }).strict()).handler(({ context, input }) => service.enterQueue(context.user, input.team, input.privateRoom, !!input.ranked)),
  join: authed.input(z.object({ team, code: z.string().regex(/^[A-Fa-f0-9]{10}$/) }).strict()).handler(({ context, input }) => service.joinRoom(context.user, input.team, input.code)),
  cancel: authed.handler(({ context }) => service.cancelQueue(context.user)),
  state: authed.input(z.object({ id }).strict()).handler(({ context, input }) => service.matchState(context.user, input.id)),
  action: authed.input(z.object({ id, revision: z.number().int().nonnegative(), requestId: z.string().uuid(), action }).strict()).handler(({ context, input }) => service.action(context.user, input)),
  wait: authed.input(z.object({ id, revision: z.number().int().nonnegative(), chatAt: z.number().nonnegative() }).strict()).handler(({ context, input }) => service.waitMatch(context.user, input.id, input.revision, input.chatAt)),
  vsBot: authed.handler(({ context }) => service.versusBot(context.user)),
  emote: authed.input(z.object({ id, emote: z.string().max(20) }).strict()).handler(({ context, input }) => service.emote(context.user, input.id, input.emote)),
  rematch: authed.input(z.object({ id }).strict()).handler(({ context, input }) => service.rematch(context.user, input.id)),
  duoCreate: authed.input(z.object({ robot, isPublic: z.boolean() }).strict()).handler(({ context, input }) => rooms.duoCreate(context.user, input.robot, input.isPublic)),
  duoJoin: authed.input(z.object({ robot, code: room.optional() }).strict()).handler(({ context, input }) => rooms.duoJoin(context.user, input.robot, input.code)),
  duoRoom: authed.input(z.object({ code: room }).strict()).handler(({ context, input }) => rooms.duoRoom(context.user, input.code)),
  duoSeat: authed.input(z.object({ code: room, seat: z.number().int().min(0).max(3) }).strict()).handler(({ context, input }) => rooms.duoSeat(context.user, input.code, input.seat)),
  duoStart: authed.input(z.object({ code: room }).strict()).handler(({ context, input }) => rooms.duoStart(context.user, input.code)),
  duoLeave: authed.handler(({ context }) => rooms.duoLeave(context.user)),
  surrender: authed.input(z.object({ id }).strict()).handler(({ context, input }) => service.surrender(context.user, input.id)),
};