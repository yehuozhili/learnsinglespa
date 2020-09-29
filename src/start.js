import { reroute } from "./navigations/reroute";

export let started = false;
export function start() {
	started = true;
	//挂载应用
	reroute(); //除了去加载应用还需要挂载
}
