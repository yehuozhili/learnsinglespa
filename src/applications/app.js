import {
	NOT_LOADED,
	SKIP_BECAUSE_BROKEN,
	shouldBeActive,
	LOADING_SOURCE_CODE,
	NOT_BOOTSTRAPPED,
	BOOTSTRAPPING,
	NOT_MOUNTED,
	MOUNTED,
} from "./app.helper";
import { reroute } from "../navigations/reroute";

const app = []; //用来存放所有应用

/**
 *
 *
 * @export
 * @param {*} appName 应用名
 * @param {*} loadApp 加载的应用
 * @param {*} activeWhen 激活时会调用loadApp
 * @param {*} customProps 自定义属性
 */
export function registerApplication(appName, loadApp, activeWhen, customProps) {
	app.push({
		name: appName,
		loadApp,
		activeWhen,
		customProps,
		status: NOT_LOADED,
	});
	reroute(); //加载应用
}

export function getAppChanges() {
	const appsToUnmount = [];
	const appsToLoad = [];
	const appstoMount = [];

	app.forEach((v) => {
		const appShouldBeActive = shouldBeActive(v);
		switch (v.status) {
			case NOT_LOADED:
			case LOADING_SOURCE_CODE:
				if (appShouldBeActive) {
					appsToLoad.push(v);
				}
				break;
			case NOT_BOOTSTRAPPED:
			case BOOTSTRAPPING:
			case NOT_MOUNTED:
				if (appShouldBeActive) {
					appstoMount.push(v);
				}
				break;

			case MOUNTED:
				if (!appShouldBeActive) {
					appsToUnmount.push(v);
				}
				break;
			default:
				break;
		}
	});
	return {
		appsToUnmount,
		appsToLoad,
		appstoMount,
	};
}
