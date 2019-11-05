const mongoose = require('mongoose')

mongoose
  .connect(`${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .catch(err => {
    // eslint-disable-next-line no-console
    console.log(err)
  })

mongoose.connection.on('open', () => {
  // eslint-disable-next-line no-console
  console.log('MongoDB connected')
})

module.exports = mongoose
