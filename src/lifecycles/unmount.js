import { MOUNTED, UNMOUNTING, NOT_MOUNTED } from "../applications/app.helper";

export async function toUnmountPromise(app) {
	if (app.status !== MOUNTED) {
		return app;
	}
	app.status = UNMOUNTING;
	await app.unmount(app.customProps);
	app.status = NOT_MOUNTED;
	return app;
}
