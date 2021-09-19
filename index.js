import express from 'express'
const app = express()
const port = 40404

app.use(express.json())

app.post('/', (req, res) => {
  if(req.body.secret === 'satana_mogila_kladbische_govno_hyila'){
    const text = req.body.object.message.text
    if(text.indexOf('гдз ') === 0) {
      console.log(text)
    }
  }
  res.send('ok')
})

app.listen(port, () => {
  console.log(`GDZ bot app listening at http://localhost:${port}`)
})
