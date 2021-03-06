/**
 * Form.react.js
 *
 * The form with a username and a password input field, both of which are
 * controlled via the application state.
 *
 */

import React, { Component } from 'react';
import { TextInputBlock } from '../partials';
import { updateForgotPasswordForm} from '../../actions';

const assign = Object.assign || require('object.assign');

export class ForgetForm extends Component {
  render() {
    return (
      <form onChange={this._onChange.bind(this)} onSubmit={this._onSubmit.bind(this)} >
        <h3>Please enter your email to obtain your password</h3>
        <TextInputBlock
          error={this.props.errors.email}
          value={this.props.data.email}
          name='email'
          type='email'
          label='Email'
          placeholder='Your Email' autoCorrect="off" autoCapitalize="off" spellCheck="false"/>
   

        <button className='object--center button--gold'>Submit</button>
      </form>
    );
  }

  _onChange(event){
    let newState = this._mergeWithCurrentState({
      [event.target.name]: event.target.value
    });

    this._emitChange(newState);
  }

  // Merges the current state with a change
  _mergeWithCurrentState(change) {
    return assign(this.props.data, change);
  }

  // Emits a change of the form state to the application state
  _emitChange(newState) {
    this.props.dispatch(updateForgotPasswordForm(newState));
  }

  _onSubmit(event){
    event.preventDefault();

    this.props.dispatch(updateForgotPasswordForm({
      email: this.props.data.email,
   
    }))


  }
}
