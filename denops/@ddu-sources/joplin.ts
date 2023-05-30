import {
  BaseSource,
  DduOptions,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v2.2.0/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v2.2.0/deps.ts";
import { ActionData } from "../@ddu-kinds/joplin.ts";
import { config, noteApi } from "https://esm.sh/joplin-api@0.5.1";
// https://www.npmjs.com/package/joplin-api

type Params = {
  token: string;
};

export class Source extends BaseSource<Params> {
  override kind = "joplin";

  override gather(args: {
    denops: Denops;
    options: DduOptions;
    sourceOptions: SourceOptions;
    sourceParams: Params;
    input: string;
  }): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        config.token = args.sourceParams.token;

        const tree = async () => {
          const items: Item<ActionData>[] = [];
          for (let pageIdx = 0, more = true; more; pageIdx++) {
            const res = await noteApi.list({ page: pageIdx });
            for (const note of res.items) {
              items.push({
                word: note.title,
                action: {
                  id: note.id,
                  token: args.sourceParams.token,
                },
              });
            }
            more = res.has_more;
          }
          return items;
        };

        controller.enqueue(await tree());
        controller.close();
      },
    });
  }

  override params(): Params {
    return {
      token: "",
    };
  }
}
