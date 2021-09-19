import express from 'express'
const app = express()
const port = 40404

app.post('/', (req, res) => {
  console.log(req) //{ "type": "confirmation", "group_id": 188903082 }
  res.send('820bbe48')
})

app.listen(port, () => {
  console.log(`GDZ bot app listening at http://localhost:${port}`)
})
