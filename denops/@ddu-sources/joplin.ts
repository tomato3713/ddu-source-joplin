import {
  BaseSource,
  DduOptions,
  Item,
  SourceOptions,
} from "https://deno.land/x/ddu_vim@v3.8.1/types.ts";
import { Denops } from "https://deno.land/x/ddu_vim@v3.8.1/deps.ts";
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
        const input = args.sourceOptions.volatile
          ? args.input
          : args.sourceParams.input;
        config.token = args.sourceParams.token;

        const getAllNotes = async (fullPath: boolean, searchWord: string) => {
          const items: Item<ActionData>[] = [];
          const folders = await folderApi.listAll();

          const dig = async (
            items: Item<ActionData>[],
            folders: FolderListAllRes[],
            pathTo: string,
            searchWord: string,
          ) => {
            for (const folder of folders) {
              folder.children &&
                (await dig(
                  items,
                  folder.children,
                  `${pathTo}/${folder.title}`,
                  searchWord,
                ));

              const notes = await folderApi.notesByFolderId(folder.id, [
                "id",
                "parent_id",
                "title",
                "body",
                "is_todo",
                "todo_completed",
                "todo_due",
              ]);
              notes.map((e) => {
                // 検索ワードが指定されていて，タイトルと本文に見付からなかった場合はitemsに登録しない。
                if (
                  searchWord.length > 0 &&
                  !e.title.includes(searchWord) &&
                  !e.body.includes(searchWord)
                ) {
                  return;
                }
                items.push({
                  word: fullPath
                    ? `${pathTo}/${folder.title}/${e.title}`
                    : e.title,
                  action: {
                    id: e.id,
                    token: args.sourceParams.token,
                    parent_id: e.parent_id,
                    isFolder: false,
                    title: e.title,
                    is_todo: e.is_todo != 0,
                    todo_completed: e.todo_completed != 0,
                    todo_due: e.todo_due != 0,
                  },
                });
              });
            }
          };

          await dig(items, folders, "", searchWord);
          return items;
        };

        controller.enqueue(
          await getAllNotes(args.sourceParams.fullPath, input),
        );
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
