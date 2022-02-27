const express = require('express');
const common = require('./Common');
const Settings = require('../models/Settings');
let ImageHelper = require('../helpers/ImageHelper');

class SearchEngineRouter{
    
    isGuest;
    router;

    constructor(isGuest)
    {
        this.isGuest = isGuest;
        this.router = express.Router();
        this.init();
    }

    get()
    {
        return this.router;
    }

    async getSettings(req){
        if(!this.isGuest)
            return req.settings;
        // get the guest settings        
        return await Settings.getForGuest();
    }

    init() {
        
        this.router.get('/', async (req, res) => {
            let args = common.getRouterArgs(req, 
            { 
                title: 'Search Engines',
                guestSettings: this.isGuest
            });
            args.settings = await this.getSettings(req);
            res.render('search-engines', args);
        });

        this.router.post('/:uid/default/:isDefault', async(req, res) => {
            if(req.isNew === false)
            {              
                for(let se of req.settings.SearchEngines)
                {
                    se.IsDefault = false;
                }      
                req.searchEngine.IsDefault = req.params.isDefault === 'true';
                req.settings.save();
            }
            res.status(200).send('');
        });        

        this.router.post('/:uid/status/:enabled', async(req, res) => {
            if(req.isNew === false)
            {            
                req.searchEngine.Enabled = req.params.enabled === 'true';
                req.settings.save();
            }
            res.status(200).send('');
        });        

        this.router.route('/:uid')
            .get((req, res) => {
                if(req.searchEngine.IsSystem)
                {
                    res.status(400).send('Cannot modify a system search engine');
                    return;
                }
                res.render('search-engine', common.getRouterArgs(req, 
                { 
                    title: 'Search Engine',   
                    model: req.searchEngine,
                    guestSettings: this.isGuest
                }));    
            })
            .post(async (req, res) => {
                if(req.searchEngine.IsSystem)
                {
                    res.status(400).send('Cannot modify a system search engine');
                    return;
                }

                let icon = await new ImageHelper().saveImageIfBase64(req.body.Icon, 'icons', req.uid);
                if(req.isNew)
                {
                    if(!req.settings.SearchEngines)
                        req.settings.SearchEngines = [];
                    req.settings.SearchEngines.push({
                        Uid: req.uid,
                        Name: req.body.Name,
                        Url: req.body.Url,
                        Shortcut: req.body.Shortcut,
                        Icon: icon
                    });
                }
                else
                {
                    req.searchEngine.Name = req.body.Name;
                    req.searchEngine.Url = req.body.Url;
                    req.searchEngine.Shortcut = req.body.Shortcut;
                    req.searchEngine.Icon = icon;
                }
                req.settings.save();
                res.status(200).send('');
            })
            // .delete('/:uid', async (req, res) => {
            //     if(req.isNew === false)
            //     {
            //         if(req.searchEngine.IsSystem)
            //         {
            //             res.status(400).send('Cannot delete a system search engine, only disable it');
            //             return;
            //         }
            //         let uid = req.uid;        
            //         let settings = req.settings;
            //         settings.SearchEngines = settings.SearchEngines.filter(x => x.Uid !== uid);
            //         await settings.save();
            //     }

            //     res.status(200).send('').end();
            // });

        
        this.router.param('uid', async (req, res, next, uid) => {
            if(!uid){
                res.status(400).send('no uid specified').end();
                return;    
            }
            let settings = await this.getSettings(req);
            let searchEngine = settings.SearchEngines.filter(x => x.Uid === uid);
            console.log('searchEngine', searchEngine);
            searchEngine = searchEngine?.length ? searchEngine[0] : null;
            req.isNew = !searchEngine;
            if(!searchEngine){
                // its new        
                searchEngine = { 
                    Uid: uid,
                    Icon: '',
                    Name: '',
                    Url: 'http://google.com/?q=%s',                    
                    IsDefault: false
                };
            }
            req.uid = uid;
            req.settings = settings;
            req.searchEngine = searchEngine;
            next();
        });
    }
}
  


module.exports = SearchEngineRouter;