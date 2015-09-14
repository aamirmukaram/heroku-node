/**
 * Created by aamir on 09/09/15.
 */

// USERS MODEL
// =============================================================================
module.exports = function(sequelize,DataTypes)
{
    User = sequelize.define('users', {
        sub: DataTypes.STRING,
        name: DataTypes.STRING,
        email: DataTypes.STRING,
        picture: DataTypes.STRING,
        gender: DataTypes.STRING
    }, {
        instanceMethods: {
            retrieveAll: function(onSuccess, onError) {
                User.findAll({
                    raw: true
                }).then(onSuccess).catch(onError);
            },
            add: function(onSuccess, onError) {
                var sub = this.sub;
                var name = this.name;
                var email= this.email;
                var picture=this.picture;
                var gender=this.gender;
                User.build({
                    sub: sub,
                    name: name,
                    email: email,
                    picture: picture,
                    gender: gender,

                }).save().then(onSuccess).catch(onError);
            },
            retrieveById: function(sub, onSuccess, onError) {
                User.find({
                    where: {
                        sub: sub
                    }
                }, {
                    raw: true
                }).then(onSuccess).catch(onError);
            }
        }
    });
}
