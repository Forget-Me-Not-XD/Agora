import { defineConfig } from 'vitest/config';
import path from 'path';

// Die gevolgtrekkings werk met plaaslike tyd (kalenderdae, maande), so toets altyd in SA-tyd,
// ongeag die masjien se tydsone. Die toets-werkers erf hierdie omgewing.
process.env.TZ = 'Africa/Johannesburg';

export default defineConfig({
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
    test: {
        include: ['src/**/*.test.ts'],
    },
});
