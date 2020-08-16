import { reroute } from "./reroute";

const captureEventListener = {
	hashchange: [],
	popstate: [],
};

export const routingEventsListeningTo = ["hashchange", "popstate"];
function urlReroute() {
	reroute([], arguments);
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
	window.history.pushState,
	"pushState"
);
window.history.replaceState = patchedUpdateState(
	window.history.replaceState,
	"replaceState"
);
