// ==UserScript==
// @name         eShop Purchase History Exporter
// @namespace    http://codekiem.com
// @version      1.1
// @description  Export your purchase history on eShop to CSV
// @author       redphx
// @match        https://ec.nintendo.com/my/transactions/*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/redphx/eshop-purchase-history/master/eshop-purchase-history.user.js
// ==/UserScript==

(function() {
    'use strict'

    const LIMIT = 10

    var csv, summary
    var exportBtn

    function resetData() {
        csv = []
        summary = {}
    }

    function exportCsv() {
        var rows = []
        rows.push(['transaction_type', 'transaction_id', 'title', 'device_type', 'content_type', 'date', 'currency', 'raw_value', 'formatted_value'])

        csv.forEach((row, i) => {
            rows.push(row.join(','))
        })

        rows.push('')
        rows.push('')
        rows.push('')

        rows.push(['currency', 'games', 'total'])
        for (let currency in summary) {
            rows.push([currency, summary[currency].games, summary[currency].total])
        }

        let csvString = rows.join("\r\n")
        var a = document.createElement('a')
        a.href = 'data:attachment/csv,' + encodeURIComponent(csvString)
        a.target = '_blank'
        a.download = 'eshop-purchase-history-' + (+new Date) + '.csv'

        document.body.appendChild(a)
        a.click()
    }

    function getTransactions(offset, limit) {
        if (offset == 0) {
            resetData()
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://ec.nintendo.com/api/my/transactions?limit=' + limit + '&offset=' + offset,
            headers: {'Accept': 'application/json'},
            onload: function(response) {
                let json = JSON.parse(response.responseText)
                let { transactions, total, error } = json

                if (error) {
                    alert(error.message)
                    return
                }

                if (!transactions) {
                    alert('Please refresh this page and try again')
                    return
                }

                transactions.forEach((transaction, i) => {
                    let { transaction_type, transaction_id, title, device_type, content_type, date, amount } = transaction
                    amount = amount || {}

                    let { currency, raw_value, formatted_value } = amount

                    csv.push([transaction_type, transaction_id, '"' + title + '"', device_type, content_type, date, currency, raw_value, formatted_value])

                    if (raw_value) {
                        if (!summary[currency]) {
                            summary[currency] = {
                                games: 0,
                                total: 0,
                            }
                        }

                        summary[currency].games += 1
                        summary[currency].total += parseFloat(raw_value)
                    }
                })

                if (offset < total - 1) {
                    getTransactions(offset + limit, limit)
                } else {
                    exportCsv()

                    exportBtn.removeAttribute('disabled')
                }
            }
        })
    }

    function render(titleElm) {
        exportBtn = document.createElement('button')
        exportBtn.className = 'o_c-button03'
        exportBtn.style.display = 'block'
        exportBtn.style.margin = '0 auto'
        exportBtn.style.background = '#e60012'
        exportBtn.style.color = 'white'
        exportBtn.style.padding = '10px'

        exportBtn.innerText = 'Export Purchase History to CSV'
        exportBtn.addEventListener('click', e => {
            e.preventDefault()
            getTransactions(0, LIMIT)

            exportBtn.setAttribute('disabled', 'disabled')
        })

        titleElm.parentNode.appendChild(exportBtn)
    }

    var retryInterval = setInterval(() => {
        let titleElm = document.querySelector('div[class^=MyTransactions]')
        if (titleElm) {
            clearInterval(retryInterval)
            render(titleElm)
        }
    }, 1000)
})()
