import {hash} from "./hash"

export const hashTerm = (t:Term):string =>mat(t,
  d=> hash(JSON.stringify(d)),
  (n,t,b)=> hash("lam" + n + t + hashTerm(b)),
  (f,x) => hash("app" + hashTerm(f) + hashTerm(x)),
  (v) => hash("var" + v)
)

type Dat = string | number | Dat[]
type Fun = {$fun: [number, "proc", string] | [number, "lam", Term]}
type Var = {$var: number}
type App = {$app: [Term, Term]}
export type Term = Dat | Fun | Var | App

export const mat = <T>(w:Term, d:(d:Dat)=>T, f:(n:number, tag:"proc" | "lam", b:Term)=>T, a:(app:Term,b:Term)=>T, v:(v:number)=>T):T=>
  (Array.isArray(w) || typeof w != "object") ? d(w)
: ("$fun" in w) ? f(...w.$fun as [number, "proc", string]) : ("$app" in w) ? a(...w.$app) : v(w.$var)

const mklam = (arity: number, body: Term):Fun => ({$fun: [arity, "lam", body]})


export const a = (f:Term,...xs:Term[]): Term => xs.reduce((f,x)=>({$app:[f,x]}), f)

const kal = (f:Term, env:Term[]):Term => mat<Term>(f,()=>f, ()=>f,(f,x)=> a(kal(f, env), kal(x, env)), v=> env[v]!)

export let fake_builtins = { store: (k:Term,v:Term)=>k, load: (k:Term)=>k, secret: (f:Term, arg:Term)=>a(f, "xxx", arg)}
export const proc = (code: string):Fun => {
  code = String(code)
  let size:number = Function(...Object.keys(fake_builtins),"return " + code)(...Object.values(fake_builtins)).length
  return {$fun: [size, "proc", code]}
}

export const run = (t:Term, store: (k:string,v:string)=>void, load: (k:string)=>string | undefined, runtimeKey: string) :Term =>{

  const mkproc = (code: string): Lam =>Function(...Object.keys(builtins),"return " + code)(...Object.values(builtins))

  const secret = (fn:Term, arg:Term):Term=> a(fn, hash(hashTerm(fn) + runtimeKey), arg)

  const builtins : {[key:string]: Lam}  = {
    store: (k:Term, v:Term)=> {
      let ks = hashTerm(k)
      store(ks, JSON.stringify(v))
      return "ok"
    },
    load: (k:Term): Term =>{
      let ks = hashTerm(k)
      let res = load(ks)
      return res ? JSON.parse(res) : 0
    },
    secret }

  const $ = (v:Term, ...args:Term[]):Term=>mat<Term>(v,
    d=>a(d, ...args),
    (n,t,b)=>
      (n>args.length) ? a(v, ...args)
      : $(
        (t=="proc") ? mkproc(b as string) ( ...args.slice(0,n).map(x=>$(x)))
        : kal(b, args.slice(0, n).map(x=>$(x))), ...args.slice(n).map(x=>$(x))
      ),
    (f,x)=> $(f,x,...args),
    ()=>a(v, ...args.map(x=>$(x)))
  )
  return $(t)
}


export const fmt = (v:Term):string=>{
  let defs: Term[] = []

  let code = ""
  let gob = (v:Term):string => mat(v,
    d=>JSON.stringify(d),
    (n,t,b)=>{
      if (!defs.includes(v)){
        defs.push(v)
        let argstr =Array.from({length:n}, (_,i )=>`x${i}`).join(", ")
        let c = `l${defs.length-1} = ${ t == "proc" ? `proc(${JSON.stringify(b)})` : "lam((" + argstr + ")=>" + gob(b) + ")"}\n`
        code += c
      }
      return `l${defs.indexOf(v)!}`
    },
    (f,x)=> `$(${gob(f)}, ${gob(x)})`,
    v=> `x${v}`
  )
  let c = gob(v)
  return code + c
}

export type Lam = (...x:Term[])=>Term

export const lam = (f: Lam):Term =>{
  let vars = Array.from({length: f.length}, (_,i )=> ({$var: i} as Var))
  let vmap = new Map<Var, Var> ()
  let go =(t:Term):Term=> mat<Term>(t,
    ()=>t, ()=> t, (a,b)=> ({$app:[go(a), go(b)] }),
    ()=>{
      if (vars.includes(t as Var)) return t
      if (!vmap.has(t as Var)) vmap.set(t as Var, {$var: vmap.size} as Var)
      return vmap.get(t as Var)!
    }
  )

  let bod = f(...vars)
  bod = go(bod)

  vars.forEach (v=>v.$var += vmap.size)
  let res = a(mklam(f.length + vmap.size, bod), ...vmap.keys())
  return res
}

