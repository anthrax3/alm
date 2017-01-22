import * as sw from "../../../../utils/simpleWorker";
import * as contract from "./bundlerContract";
import * as fs from "fs";
import * as webpack from 'webpack';

namespace Worker {
    export const start: typeof contract.worker.start = async (q) => {
        startLiveBundling(q);
        return {};
    }
}

// Ensure that the namespace follows the contract
const _checkTypes: typeof contract.worker = Worker;
// run worker
export const { master } = sw.runWorker({
    workerImplementation: Worker,
    masterContract: contract.master
});

/**
 * Creates a webpack bundle
 */
export function startLiveBundling(args: {
    entryFileName: string,
    outputFileName: string,
}) {

    if (!fs.existsSync(args.entryFileName)) {
        /** Webpack ignores this siliently sadly so we need to catch it ourselves */
        const error = `Entry point does not exist: ${args.entryFileName}`;
        console.error(error);
        master.buildComplete({ type: 'error', error: error });
        return;
    }

    const config = {
        devtool: 'source-map',
        entry: args.entryFileName,
        output: {
            filename: args.outputFileName
        },
        resolve: {
            alias: {
                'alm': __dirname + '/../client/alm.ts',
            },
            extensions: ['', '.ts', '.tsx', '.js'],
        },
        module: {
            loaders: [
                { test: /\.tsx?$/, loader: 'ts-loader' }
            ]
        },
        /** Decrease noise */
        stats: {
            hash: false, version: false, timings: false, assets: false,
            chunks: false, modules: false, reasons: false, children: false,
            source: false, publicPath: false, warnings: true,
            /** Errors only */
            errors: true,
            errorDetails: true,
        },
        /**
         * Custom compiler options for demo building.
         * Effectively what would be in each app tsconfig.json
         **/
        ts: {
            compilerOptions: {
                "jsx": "react",
                "target": "es5",
                "moduleResolution": "node",
                "experimentalDecorators": true,
                "lib": [
                    "es6",
                    "dom"
                ]
            }
        }
    };

    const compiler = webpack(config);
    compiler.run(function(err, stats) {
        if (err) {
            console.error("BUNDLING FAILED:", args);
            console.error(err);
            master.buildComplete({ type: 'error', error: JSON.stringify(err) });
            return;
        }
        master.buildComplete({ type: 'success' });
        return;
    });
}
