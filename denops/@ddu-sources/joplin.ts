import {
  BaseSource,
  DduOptions,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v2.2.0/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v2.2.0/deps.ts";
import { ActionData } from "../@ddu-kinds/joplin.ts";
import {
  config,
  folderApi,
  FolderListAllRes,
} from "https://esm.sh/joplin-api@0.5.1";
// https://www.npmjs.com/package/joplin-api

type Params = {
  token: string;
  fullPath: boolean;
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

        const getAllNotes = async (fullPath: boolean) => {
          const items: Item<ActionData>[] = [];
          const folders = await folderApi.listAll();

          const dig = async (
            items: Item<ActionData>[],
            folders: FolderListAllRes[],
            pathTo: string,
          ) => {
            for (const folder of folders) {
              folder.children &&
                await dig(items, folder.children, `${pathTo}/${folder.title}`);

              const notes = await folderApi.notesByFolderId(folder.id, ['id', 'parent_id', 'title', 'body', 'is_todo']);
              notes.map((e) => {
                items.push({
                  word: fullPath
                    ? `${pathTo}/${folder.title}/${e.title}`
                    : e.title,
                  action: {
                    id: e.id,
                    name: e.title,
                    body: e.body,
                    is_todo: e.is_todo === 0,
                    token: args.sourceParams.token,
                  },
                });
              });
            }
          };

          await dig(items, folders, "");
          return items;
        };

        controller.enqueue(await getAllNotes(args.sourceParams.fullPath));
        controller.close();
      },
    });
  }

  override params(): Params {
    return {
      token: "",
      fullPath: false,
    };
  }
}
