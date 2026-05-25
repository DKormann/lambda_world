# lambda world

a pragmatic take on homoiconic scripting in JS context.
heavy inspired by [PLAN](https://github.com/xocore-tech/PLAN)

language definition:

````ts
type Dat = string | number | Dat[]
type Fun = {$fun: [number, "proc", string] | [number, "lam", Term]}
type Var = {$var: number}
type App = {$app: [Term, Term]}
export type Term = Dat | Fun | Var | App
```

The language is based on combinators with embedded JS functions that are supposed to be side effect free.

the runtime gives access to 3 special builtin functions
 - load(key:Term) // loads a term from global DB
 - store(key:Term, value: Term)
 - secret(f:Term, val: Term) // runs a function with its own secret fingerprint

