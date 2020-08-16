import {
	NOT_BOOTSTRAPPED,
	BOOTSTRAPPING,
	NOT_MOUNTED,
} from "../applications/app.helper";

export async function toBootStrapPromise(app) {
	if (app.status !== NOT_BOOTSTRAPPED) {
		return app;
	}
	app.status = BOOTSTRAPPING;
	await app.bootstrap(app.customProps);
	app.status = NOT_MOUNTED;
	return app;
}
