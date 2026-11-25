import { z } from "zod";
import { authed } from "../middleware/auth";
import { validateTeam } from "../online/engine";
import * as g from "../guild/members";
import * as b from "../guild/battles";
import * as r from "../guild/rooms";

const id = z.string().uuid(), pilot = z.string().min(1).max(120);
const robot = z.string().max(50).refine(v => { try { validateTeam([v]); return true; } catch { return false; } }, "Robô inválido.");
const team = z.array(robot).min(1).max(4).refine(v => new Set(v).size === v.length, "Escolha robôs diferentes.");
export const guild = {
  home: authed.handler(({ context }) => g.home(context.user)),
  list: authed.input(z.object({ term: z.string().trim().max(32) })).handler(({ input }) => g.list(input.term)),
  create: authed.input(z.object({ name: z.string().trim().min(3).max(28), tag: z.string().trim().regex(/^[A-Za-z0-9]{3,4}$/), emblem: z.enum(["bronze", "ouro", "platina", "diamante", "mestre", "lenda"]), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), motto: z.string().trim().max(90), joinMode: z.enum(["open", "request"]) })).handler(({ context, input }) => g.create(context.user, input)),
  join: authed.input(z.object({ id })).handler(({ context, input }) => g.join(context.user, input.id)),
  decide: authed.input(z.object({ target: pilot, accept: z.boolean() })).handler(({ context, input }) => g.decide(context.user, input.target, input.accept)),
  manage: authed.input(z.object({ target: pilot, action: z.enum(["kick", "officer", "member", "transfer", "leave"]) })).handler(({ context, input }) => g.manage(context.user, input.target, input.action)),
  defense: authed.input(z.object({ team: team.refine(v => v.length === 3, "A defesa usa três robôs.") })).handler(({ context, input }) => g.defense(context.user, input.team)),
  status: authed.handler(({ context }) => b.status(context.user)),
  war: authed.input(z.object({ search: z.boolean() })).handler(({ context, input }) => b.queueWar(context.user, input.search)),
  attack: authed.input(z.object({ kind: z.enum(["war", "boss"]), team, target: pilot.optional() })).handler(({ context, input }) => b.attack(context.user, input.kind, input.team, input.target)),
  rooms: authed.handler(({ context }) => r.listRooms(context.user)),
  open: authed.input(z.object({ mode: z.enum(["x1", "x2"]), robot })).handler(({ context, input }) => r.open(context.user, input.mode, input.robot)),
  seat: authed.input(z.object({ id, index: z.number().int().min(0).max(3), robot })).handler(({ context, input }) => r.seat(context.user, input.id, input.index, input.robot)),
  leave: authed.handler(({ context }) => r.leave(context.user)),
  start: authed.input(z.object({ id })).handler(({ context, input }) => r.start(context.user, input.id)),
};
