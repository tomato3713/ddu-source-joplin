import {
  BaseSource,
  DduOptions,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v2.9.2/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v2.2.0/deps.ts";
import { basename, join } from "https://deno.land/std@0.190.0/path/mod.ts";
import { ActionData } from "https://deno.land/x/ddu_kind_joplin@v0.1.2/denops/@ddu-kinds/joplin.ts";
import {
  config,
  folderApi,
  FolderListAllRes,
} from "https://esm.sh/joplin-api@0.5.1";
// https://www.npmjs.com/package/joplin-api

type Params = {
  token: string;
  fullPath: boolean;
  input: string;
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
        const basePath = args.sourceOptions.path;

        const getAllNotes = async (basePath: string) => {
          const items: Item<ActionData>[] = [];
          const folderName = basename(basePath);

          const folders = await folderApi.listAll();
          const ret = search(folders, folderName);

          for (const e of ret) {
            items.push({
              word: e.title,
              isTree: true,
              treePath: join(basePath, e.id) + "/",
              action: {
                id: e.id,
                token: args.sourceParams.token,
                parent_id: e.parent_id,
                isFolder: true,
                title: e.title,
                is_todo: false,
              },
            });
          }

          if (folderName != "") {
            const notes = await folderApi.notesByFolderId(folderName, [
              "title",
              "id",
              "is_todo",
              "parent_id",
            ]);
            for (const note of notes) {
              items.push({
                word: note.title,
                isTree: false,
                treePath: join(basePath, note.id),
                action: {
                  id: note.id,
                  token: args.sourceParams.token,
                  parent_id: note.parent_id,
                  is_todo: note.is_todo === 0,
                  isFolder: false,
                  title: note.title,
                },
              });
            }
          }

          return items;
        };

        if (basePath.length === 0 || basePath.endsWith("/")) {
          controller.enqueue(await getAllNotes(basePath));
        } else {
          console.log(`not folder`);
        }
        controller.close();
      },
    });
  }

  override params(): Params {
    return {
      token: "",
      input: "",
      fullPath: false,
    };
  }
}

// 対象を見付ける
const search = (
  folders: FolderListAllRes[],
  target: string
): FolderListAllRes[] => {
  if (target.length === 0) return folders;
  for (const folder of folders) {
    if (folder.id === target) return folder.children ?? [];
    if (folder.children) {
      const res = search(folder.children, target);
      if (res.length != 0) return res;
    }
  }
  return [];
};
