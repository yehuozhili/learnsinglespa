import { started } from "../start";
import { getAppChanges } from "../applications/app";
import { toLoadPromise } from "../lifecycles/load";
import { toBootStrapPromise } from "../lifecycles/bootstrap";
import { toMountPromise } from "../lifecycles/mount";
import { toUnmountPromise } from "../lifecycles/unmount";
import "./navigator-event";

export function reroute() {
	const { appsToUnmount, appsToLoad, appstoMount } = getAppChanges();
	if (started) {
		return performAppChanges(); //根据路径装载
	} else {
		return loadApps(); //预先加载
	}
	async function loadApps() {
		let apps = await Promise.all(appsToLoad.map(toLoadPromise)); //获取3方法放到app上
	}
	async function performAppChanges() {
		//卸载不需要应用，加载需要应用
		let unmount = appsToUnmount.map(toUnmountPromise);
		appsToLoad.map(async (app) => {
			app = await toLoadPromise(app);
			app = await toBootStrapPromise(app);
			return toMountPromise(app);
		});
		appstoMount.map(async (app) => {
			app = await toBootStrapPromise(app);
			return toMountPromise(app);
		});
	}
}
