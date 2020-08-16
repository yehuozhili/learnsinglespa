(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.singleSpa = {}));
}(this, (function (exports) { 'use strict';

	const NOT_LOADED = "NOT_LOADED"; // 没有加载过
	const LOADING_SOURCE_CODE = "LOADING_SOURCE_CODE"; // 加载原代码
	const NOT_BOOTSTRAPPED = "NOT_BOOTSTRAPPED"; // 没有启动
	const BOOTSTRAPPING = "BOOTSTRAPPING"; // 启动中
	const NOT_MOUNTED = "NOT_MOUNTED"; // 没有挂载
	const MOUNTING = "MOUNTING"; // 挂载中
	const MOUNTED = "MOUNTED"; // 挂载完毕
	const UNMOUNTING = "UNMOUNTING"; // 卸载中
	function shouldBeActive(app) {
		// 当前app是否应该激活
		return app.activeWhen(window.location);
	}

	let started = false;
	function start() {
		started = true;
		//挂载应用
		reroute(); //除了去加载应用还需要挂载应用
	}

	function flattenFnArray(fns) {
		fns = Array.isArray(fns) ? fns : [fns];
		return function (props) {
			return fns.reduce(
				(p, fn) => p.then(() => fn(props)),
				Promise.resolve()
			);
		};
	}

	async function toLoadPromise(app) {
		if (app.loadPromise) {
			return app.loadPromise;
		}
		return (app.loadPromise = Promise.resolve().then(async () => {
			app.status = LOADING_SOURCE_CODE;
			let { bootstrap, mount, unmount } = await app.loadApp(app.customProps);
			app.status = NOT_BOOTSTRAPPED;

			app.bootstrap = flattenFnArray(bootstrap);
			app.mount = flattenFnArray(mount);
			app.unmount = flattenFnArray(unmount);
			delete app.loadPromise;
			return app;
		}));
	}

	async function toBootStrapPromise(app) {
		if (app.status !== NOT_BOOTSTRAPPED) {
			return app;
		}
		app.status = BOOTSTRAPPING;
		await app.bootstrap(app.customProps);
		app.status = NOT_MOUNTED;
		return app;
	}

	async function toMountPromise(app) {
		if (app.status !== NOT_MOUNTED) {
			return app;
		}
		app.status = MOUNTING;
		await app.mount(app.customProps);
		app.status = MOUNTED;
		return app;
	}

	async function toUnmountPromise(app) {
		if (app.status !== MOUNTED) {
			return app;
		}
		app.status = UNMOUNTING;
		await app.unmount(app.customProps);
		app.status = NOT_MOUNTED;
		return app;
	}

	const captureEventListener = {
		hashchange: [],
		popstate: [],
	};

	const routingEventsListeningTo = ["hashchange", "popstate"];
	function urlReroute() {
		reroute();
	}

	//挂应用逻辑
	window.addEventListener("hashchange", urlReroute);
	window.addEventListener("popstate", urlReroute);

	//应用切换后还需要处理原来的方法，需要在应用切换后再执行。
	const originalAddEventListenter = window.addEventListener;
	const originalRemoveEventListener = window.removeEventListener;
	//改写监听方法，把要执行的存起来。
	window.addEventListener = function (eventName, fn) {
		if (
			routingEventsListeningTo.indexOf(eventName) >= 0 &&
			!captureEventListener[eventName].some((listener) => listener == fn) //看重复
		) {
			captureEventListener[eventName].push(fn);
			return;
		}
		return originalAddEventListenter.apply(this, arguments);
	};
	window.removeEventListener = function (eventName, fn) {
		if (routingEventsListeningTo.indexOf(eventName) >= 0) {
			captureEventListener[eventName] = captureEventListener[
				eventName
			].filter((l) => l !== fn);
			return;
		}
		return originalRemoveEventListener.apply(this, arguments);
	};

	//浏览器路由改写 如果切换不会触发popstate

	function patchedUpdateState(updateState, methodName) {
		return function () {
			const urlBefore = window.location.href;
			updateState.apply(this, arguments); //调用切换
			const urlAfter = window.location.href;
			if (urlBefore !== urlAfter) {
				//重新加载应用，传入事件源
				urlReroute(new PopStateEvent("popstate"));
			}
		};
	}

	window.history.pushState = patchedUpdateState(
		window.history.pushState);
	window.history.replaceState = patchedUpdateState(
		window.history.replaceState);

	function reroute() {
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
	function registerApplication(appName, loadApp, activeWhen, customProps) {
		app.push({
			name: appName,
			loadApp,
			activeWhen,
			customProps,
			status: NOT_LOADED,
		});
		reroute(); //加载应用
	}

	function getAppChanges() {
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
			}
		});
		return {
			appsToUnmount,
			appsToLoad,
			appstoMount,
		};
	}

	exports.registerApplication = registerApplication;
	exports.start = start;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=single-spa.js.map
