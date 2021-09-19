import express from 'express'
const app = express()
const port = 40404
import fetch from 'node-fetch'
import nodeHtmlParser from 'node-html-parser'
const { parse } = nodeHtmlParser

app.use(express.json())

const getPictures = async numbers => {
  console.log(numbers);
  const apiURL = `https://gdz.ru/class-10/algebra/nikolskij-potapov/${numbers[0]}-item-${numbers[1]}/`
  console.log(apiURL);
  let gdz = await fetch(apiURL)
  console.log(gdz.status)
  let gdzPage = await gdz.text()
  // console.log(gdzPage)
  const root = parse(gdzPage)
  const solution = root.querySelector('.with-overtask > img')
  console.log(solution);
  console.log(numbers.join('.'), solution.getAttribute('src'))
}

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
        return [number.split('.'), letters]
      })
      homework.forEach(hw => getPictures(hw[0]))
    }
  }
  res.send('ok')
})

app.listen(port, () => {
  console.log(`GDZ bot app listening at http://localhost:${port}`)
})
