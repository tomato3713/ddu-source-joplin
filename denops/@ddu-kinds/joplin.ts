import {
  ActionFlags,
  Actions,
  BaseKind,
  Context,
  DduItem,
} from "https://deno.land/x/ddu_vim@v2.8.3/types.ts";
import {
  autocmd,
  Denops,
  op,
  vars,
} from "https://deno.land/x/ddu_vim@v2.8.3/deps.ts";
import { config, noteApi } from "https://esm.sh/joplin-api@0.5.1";
// https://www.npmjs.com/package/joplin-api

export type ActionData = {
  name?: string;
  text?: string;
  id: string;
  token: string;
};

export type Params = Record<never, never>;

export class Kind extends BaseKind<Params> {
  override actions: Actions<Params> = {
    open: async (args: {
      denops: Denops;
      context: Context;
      actionParams: unknown;
      items: DduItem[];
    }) => {
      for (const item of args.items) {
        const action = item?.action as ActionData;

        config.token = action.token;

        const noteRes = await noteApi.get(action.id, [
          "id",
          "title",
          "body",
          "parent_id",
        ]);

        await args.denops.cmd(`new ${noteRes.title}`);
        await args.denops.call("setline", 1, noteRes.body.split(/\r?\n/));

        await vars.b.set(args.denops, "joplin_note_id", noteRes.id);
        await vars.b.set(args.denops, "joplin_note_title", noteRes.title);
        await vars.b.set(args.denops, "joplin_token", action.token);
        await op.bufhidden.setLocal(args.denops, "");
        await op.modified.setLocal(args.denops, false);
        await op.filetype.setLocal(args.denops, "markdown");
        // 書き込みイベントを起点にして，/denops/joplin/main.tsで定義したAPIを実行する．
        await autocmd.group(
          args.denops,
          "joplin",
          (helper: autocmd.GroupHelper) => {
            helper.define(
              "BufWriteCmd" as autocmd.AutocmdEvent,
              "<buffer>",
              `call denops#request('joplin', 'update', [])`,
            );
          },
        );
      }

      return ActionFlags.None;
    },
  };
  override params(): Params {
    return {};
  }
}
