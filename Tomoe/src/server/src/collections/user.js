import { aql } from 'arangojs';
import uuidv4 from 'uuid/v4'
import sha256 from 'sha256';
import Boom from 'boom';

export class User{
  constructor(data = {}){
    // user information
    this.id = data.id || uuidv4();
    this.name = data.name || null;
    this.email = data.email || null;
    this.password = null;
    this.tempPassword = data.tempPassword || null;
  }

  static getCollection(){
    return db.collection('user-test');
  }

  _get(){
    return {
      id: this.id,
      name: this.name,
      email:this.email,
      password:this.password
    }
  }

  static _validatePasswords(plainPass, hashedPass){

    const salt = hashedPass.substr(0, 10);
    const validHash = salt + sha256(plainPass + salt);
    return hashedPass === validHash;
  }

  _saltAndHashPassword(password){
    function generateSalt(){
        let set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
        let salt = '';
        for (let i = 0; i < 10; i++) {
            let p = Math.floor(Math.random() * set.length);
            salt += set[p];
        }
        return salt;
    }

    let salt = generateSalt();
    let newPassword = (salt + sha256(password + salt));
    return newPassword;
  }

  _securePassword(){
   this.password = this._saltAndHashPassword(this.tempPassword);;
   this.tempPassword = null; // sets any temp password to none
 }

 _setUserData(user){
   for(let i in this){
     if((this[i] && typeof this[i] !== '[object Function]') && user[i]){
       this[i] = user[i];
     }
   }
 }

  setEmail(email){
    this.email = email;
  }

  setName(name){
    this.name = name;
  }

  setPassword(tempPassword){
    this.tempPassword = tempPassword;
  }

  confirmPassword(confirmedPassword){
    return confirmedPassword === this.tempPassword;
  }

  static query(params){
    return new Promise((resolve, reject) => {

      const collection = this.getCollection();
      let query = `FOR user IN @@collection `;
      let binds = { '@collection': collection.name }
      if(params){
        params.forEach((param) => {
          const searchBy = param.root + ((param.option) ? ('.' + param.option) : '');
          const searchByBinder = searchBy.replace(/\./g, '_');
          const operator = param.operator || '==';
          query += `FILTER user.${searchBy} ${operator} @${searchByBinder} `;
          binds[searchByBinder] = param.data;
        })
      }

      query += 'RETURN user';

      db.query(query, binds ).then((cursor) => {
        if(!cursor){
          reject(Boom.badImplementation('Something went wrong...'))
          return;
        }

       cursor.all().then((users) => {
           resolve(users);
        }).catch((err) => {
          reject(Boom.badImplementation(err));
        });
      }).catch((err) => {
        reject(Boom.badImplementation(err));
      });
    });
  }

  static find(userData, doNotFind = false){
    return new Promise((resolve, reject) => {
      const collection = this.getCollection();

      if(!userData || (userData && !userData.email && !userData.id)){
        reject(Boom.badRequest('You did not provide an id or email'));
        return;
      }


      const searchBy = (userData.id) ? 'id' : 'email';
      let query = `FOR user IN @@collection ` +
                  `FILTER user.${searchBy} == @searchBy ` +
                  'RETURN user';


      db.query(query, { '@collection': collection.name, searchBy: userData[searchBy] } ).then((cursor) => {
        if(!cursor){
          reject(Boom.badImplementation('Something went wrong...'))
          return;
        }
         cursor.all().then((users) => {
            if(users && users[0] && users[0].email){
              if(doNotFind) {
                reject(Boom.badRequest(`A user exists with this ${searchBy}!`));
                return;
              }

              resolve(users[0]);
              return;
            }

            if(doNotFind) {
              resolve();
              return;
            }

            reject(Boom.notFound(`No user found with that ${searchBy} exists`));
          }).catch((err) => {
            reject(Boom.badImplementation(err));
          });
      }).catch((err) => {
        reject(Boom.badImplementation(err));
      });
    });
  }

  validate(){
    return new Promise((resolve, reject) => {
      this.constructor.validate({ email: this.email}, this.tempPassword).then((user) => {
        this._setUserData(user);
        resolve(user);
      }).catch(err => {
        reject(err);
      })
    });
  }

  static validate(searchParam, tempPassword){
    return new Promise((resolve, reject) => {
      this.find(searchParam).then((user) => {
        if(this._validatePasswords(tempPassword, user.password)){
          resolve(user);
          return;
        }

        reject(Boom.unauthorized('Your email or password is incorrect!'));
      }).catch((err) => {
        reject(err);
      });
    });
  }


  static _modifyUserObject(newData, original = this, root = true){
		for(let i in newData){
  		if(newData[i] && (newData[i].constructor === Object || newData[i].constructor === Array)){
      	original[i] = this._modifyUserObject(newData[i], original[i], false)
      } else if(newData[i] === '$delete'){
      	delete original[i];
			} else {
				original[i] = newData[i];
			}
    }

    if(!root){
      return original;
    }
  }

  update(){
    return new Promise((resolve, reject) => {
      this.constructor.update({ id: this.id}, this).then((user) => {
        this._setUserData(user);
        resolve(user);
      }).catch(err => {
        reject(err);
      })
    });
  }

  static update(param, newData){
    return new Promise((resolve, reject) => {
      const collection = this.getCollection();

      this.find(param).then((user) => {
          const userKey = user._key;
          let updatedUser = this._modifyUserObject(newData, user, false);

          delete updatedUser.id;
          delete updatedUser._key;
          delete updatedUser._id;
          delete updatedUser._rev;

          collection.update(userKey, updatedUser).then((user) => {
            if(user){
              this.find(param).then((user) => {
                 resolve(user);
                 return;
              }).catch((err) => {
                reject(err);
                return;
              });

              return;
            }

            reject(Boom.badImplementation('There was an issue creating your user!'));
          }).catch((err) => {
            reject(Boom.badImplementation(err));
          });

          return;

      }).catch((err) => {
        reject(err);
      });
    });
  }

  save(){
    return new Promise((resolve, reject) => {
      this.constructor.find({ email: this.email }, true).then(() => {
        this._securePassword();
        let userDetails = this._get();
        this.constructor.getCollection().save(userDetails).then((user) =>{
          this.constructor.find({ email: this.email }).then((user) => {
               this._setUserData(user);
               resolve(user);
               return;
          }).catch((err) => {
            reject(Boom.badImplementation(err));
            return;
          });
        }).catch((err) => {
          reject(Boom.badImplementation(err));
        });
      }).catch((err) => {
        reject(err);
      });
    });
  }

  remove(){
    return new Promise((resolve, reject) => {
      this.constructor.remove({ email: this.email}).then((user) => {
        resolve(user);
      }).catch(err => {
        reject(err);
      })
    });
  }

  static remove(param){
    return new Promise((resolve, reject) => {
      this.find(param).then((user) => {
        this.getCollection().removeByKeys([user._key]).then(() => {
            resolve();
            return;
        }).catch((err) => {
          reject(Boom.badImplementation(err));
          return;
        });
      }).catch((err) => {
        reject(err);
      });
    });
  }
}
