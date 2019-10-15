const mongoose = require('mongoose')

mongoose
  .connect(`${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .catch(err => {
    console.log(err)
  })

mongoose.connection.on('open', () => {
  console.log('MongoDB connected')
})

module.exports = mongoose
