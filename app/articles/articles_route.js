module.exports = function(router) {

// on routes that end in /articles
// ----------------------------------------------------
    router.route('/articles')
// create a article (accessed at POST http://localhost:8080/api/articles)
        .post(function(req, res) {

            var title = req.body.title;
            var description = req.body.description;


            var article = Article.build({
                description: description,
                title: title
            });

            article.add(function(success) {
                    res.json({
                        "status":true,
                        "message":"Article created"
                    });
                },
                function(err) {
                    res.send(err);
                });
        });



}

