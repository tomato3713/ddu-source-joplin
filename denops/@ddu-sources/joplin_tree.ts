import {
  BaseSource,
  DduOptions,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v3.5.0/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v3.5.0/deps.ts";
import { ActionData } from "https://deno.land/x/ddu_kind_joplin@v0.1.7/denops/@ddu-kinds/joplin.ts";
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
        const treePath = args.sourceOptions.path;

        const getAllNotes = async (treePath: string[]) => {
          const items: Item<ActionData>[] = [];
          const folderName: string = treePath.length === 1
            ? ""
            : treePath[treePath.length - 1];

          const folders = await folderApi.listAll();
          const ret = search(folders, folderName);

          for (const e of ret) {
            items.push({
              word: e.title,
              isTree: true,
              treePath: [...treePath, e.id],
              action: {
                id: e.id,
                token: args.sourceParams.token,
                parent_id: e.parent_id,
                isFolder: true,
                title: e.title,
                is_todo: false,
                todo_due: false,
                todo_completed: false,
              },
            });
          }

          if (folderName != "") {
            const notes = await folderApi.notesByFolderId(folderName, [
              "title",
              "id",
              "is_todo",
              "parent_id",
              "todo_due",
              "todo_completed",
            ]);
            for (const note of notes) {
              items.push({
                word: note.title,
                isTree: false,
                treePath: [...treePath, note.id],
                action: {
                  id: note.id,
                  token: args.sourceParams.token,
                  parent_id: note.parent_id,
                  is_todo: note.is_todo != 0,
                  isFolder: false,
                  title: note.title,
                  todo_due: note.todo_due != 0,
                  todo_completed: note.todo_completed != 0,
                },
              });
            }
          }

          return items;
        };

        if (typeof (treePath) === "string") {
          controller.enqueue(await getAllNotes(["/"] as string[]));
        } else {
          controller.enqueue(await getAllNotes(treePath as string[]));
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
  target: string,
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
