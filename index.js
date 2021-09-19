import express from 'express'
const app = express()
const port = 40404

app.use(express.json())

app.post('/', (req, res) => {
  if(req.body.secret === 'satana_mogila_kladbische_govno_hyila'){
    let text = req.body.object.message.text
    if(text.indexOf('гдз ') === 0) {
      text = text.substring(4).trim()
      let numbers = text.replace(/\n/g, ' ').split(' ').filter(String).join(' ')
      numbers = numbers.match(/[1-3]\.[1-9]{0,3} ?\(?([а-яА-Я],? ?)*\)?/g)
      let homework = numbers.map(n => {
        let letters = n.match(/[а-яА-Я]/g)
        let number = n.match(/[1-3]\.[1-9]{0,3}/)[0]
        return [number, letters]
      })
      console.log(homework)
    }
  }
  res.send('ok')
})

app.listen(port, () => {
  console.log(`GDZ bot app listening at http://localhost:${port}`)
})
