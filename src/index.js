import config from '../config.json'

import { connect } from 'coffea'
import dude from 'debug-dude'
import { decode } from 'ent'
import request from 'request'
import xml2js from 'xml2js'

const { info, warn, error } = dude('bot')

const searchAnime = (query) => {
  return new Promise((resolve, reject) => {
    const parser = new xml2js.Parser();
    const searchQuery = encodeURIComponent(query)

    request(`https://${config.apiuser}:${config.apipass}@myanimelist.net/api/anime/search.xml?q=${searchQuery}`, (err, res, body) => {
      if (err) reject({url: `https://${config.apiuser}:${config.apipass}@myanimelist.net/api/anime/search.xml?q=${searchQuery}`, err, res, body})
      parser.parseString(body, (err, data) => {
        if (err) reject({url: `https://${config.apiuser}:${config.apipass}@myanimelist.net/api/anime/search.xml?q=${searchQuery}`, err, res, body})
        resolve(data && data.anime && data.anime.entry)
      })
    })
  })
}

const respondInline = (evt, reply) => {
  info('%o', evt)
  searchAnime(evt && evt.raw && evt.raw.query).then((entries) => {
    const answer = [];

    entries.sort((a, b) => {
      let ad = new Date(a.start_date[0])
      let bd = new Date(b.start_date[0])

      if (ad == bd) return 0
      return ad > bd ? -1 : 1
    })

    if (entries) {
      for (let entry of entries) {
        let id = `anime${entry.id[0]}`
        let image = entry.image[0]
        let title = `${entry.title[0]} (${entry.start_date[0].slice(0, 4)})`
        let english = entry.english[0]
        let description = decode(entry.synopsis[0].replace(/(<|\[)(?:.|\n)*?(\]|>)/gm, ''))

        answer.push({
          type: 'article', id, title, description,
          url: image,
          thumb_url: image,
          input_message_content: {
            message_text: `<a href='${image}'>⁣</a><b>${title}</b>\n\n<b>English:</b> <i>${english}</i>\n<b>Episodes:</b> <i>${entry.episodes[0]}</i>\n<b>Score:</b> <i>⭐ ${entry.score[0]}</i>\n<b>Status:</b> <i>${entry.status[0]}</i>\n\n<pre>${description}</pre>\n\n<a href='https://myanimelist.net/anime/${entry.id[0]}'>See more on MyAnimeList &gt;</a>`,
            parse_mode: 'HTML'
          }
        })
      }
    }

    return reply({
      type: 'answerInlineQuery',
      inlineQueryId: evt && evt.raw && evt.raw.id,
      results: answer.slice(0, 20),
      cache_time: 0
    })
  }).catch((error) => {
    warn(error)
  })
}

const networks = connect(config)
networks.on('inline_query', respondInline)

