const ThreadsPlugin = require('threads-plugin')

module.exports = {
    typescript: {
        enableTypeChecking: true
    },
    webpack: {
        plugins: {
            add: [ThreadsPlugin()]
        }
    }
}
