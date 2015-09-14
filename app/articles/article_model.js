// ARTICLES MODEL
// =============================================================================
module.exports = function(sequelize,DataTypes)
{
    Article = sequelize.define('articles', {
    description: DataTypes.STRING,
    title: DataTypes.STRING
}, {
    instanceMethods: {
        retrieveAll: function(onSuccess, onError) {
            Article.findAll({
                raw: true
            }).then(onSuccess).catch(onError);
        },
        add: function(onSuccess, onError) {
            var description = this.description;
            var title = this.title;
            Article.build({
                description: description,
                title: title
            }).save().then(onSuccess).catch(onError);
        }
    }
});
}
