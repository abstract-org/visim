module.exports = {
    webpack: {
        configure: {
            module: {
                rules: [
                    {
                        test: /Worker.js$/,
                        use: {
                            loader: 'workerize-loader',
                            options: {
                                // Use directory structure & typical names of chunks produces by "react-scripts"
                                filename: 'static/js/[name].[contenthash:8].js'
                            }
                        }
                    }
                ]
            }
        }
    }
}
