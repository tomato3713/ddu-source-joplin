# ddu-source-joplin

[Joplin](https://github.com/laurent22/joplin/) source and kind for ddu.vim.

## Required

### denops.vim

https://github.com/vim-denops/denops.vim

### ddu.vim

https://github.com/Shougo/ddu.vim

### Joplin

https://github.com/laurent22/joplin/

## Configuration

Replace JOPLIN_TOKEN_XXXX with Auth token.
Open configuration screen with `Ctrl` + `,` or `Cmd` + `,`.
Go to the Web Clipper tab and copy the Auth Token.

```
call ddu#custom#patch_global(#{
    \   sources: [
    \       #{name: 'joplin'},
    \   ],
    \   sourceParams: #{
    \     joplin: #{ 
    \       token: 'JOPLIN_TOKEN_XXXX',
    \       fullPath: v:true,
    \     },
    \   },
    \   kindOptions: #{
    \     joplin: #{
    \       defaultAction: 'open',
    \     },
    \   },
    \ })
```

## Author

tomato3713
