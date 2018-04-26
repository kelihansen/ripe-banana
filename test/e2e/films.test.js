const { assert } = require('chai');
const request = require('./request');
const { dropCollection, createToken } = require('./db');

describe('films API', () => {

    before(() => dropCollection('films'));
    before(() => dropCollection('actors'));
    before(() => dropCollection('reviews'));
    before(() => dropCollection('reviewers'));
    before(() => dropCollection('accounts'));  
    
    let token = '';
    before(() => createToken().then(t => token = t));
    
    let bbc = { name: 'BBC Films' };
    before(() => {
        return request.post('/studios')
            .send(bbc)
            .then(({ body }) => {
                bbc = body;
            });
    });
    
    let pixar = { name: 'Pixar' };
    before(() => {
        return request.post('/studios')
            .send(pixar)
            .then(({ body }) => {
                pixar = body;
            });
    });

    let emma = { name: 'Emma Thompson' };
    before(() => {
        return request.post('/actors')
            .send(emma)
            .then(({ body }) => {
                emma = body;
            });
    });

    let ebert = { name: 'Roger Ebert', company: 'rogerebert.com' };
    before(() => {
        return request.post('/reviewers')
            .send(ebert)
            .then(({ body }) => {
                ebert = body;
            });
    });

    let ado = {
        title: 'Much Ado About Nothing',
        released: 1993,
        cast: []
    };

    let incredibles = {
        title: 'The Incredibles',
        released: 2004,
        cast: []
    };

    let castMember;

    const checkOk = res => {
        if(!res.ok) throw res.error;
        return res;
    };

    it('saves a film', () => {
        ado.studio = bbc._id;
        castMember = { actor: emma._id };
        ado.cast.push(castMember);

        return request.post('/films')
            .send(ado)
            .then(checkOk)
            .then(({ body }) => {
                const { _id, __v } = body;
                castMember._id = body.cast[0]._id;
                assert.ok(_id);
                assert.equal(__v, 0);
                assert.deepEqual(body, {
                    ...ado,
                    _id,
                    __v
                });
                ado = body;
            });
    });

    const getFields = ({ _id, title, released }) => ({ _id, title, released });

    it('gets all films', () => {
        incredibles.studio = pixar._id;

        return request.post('/films')
            .send(incredibles)
            .then(checkOk)
            .then(({ body }) => {
                incredibles = body;
                return request.get('/films');
            })
            .then(({ body }) => {
                assert.deepEqual(body, [{
                    ...getFields(ado),
                    studio: { _id: ado.studio, name: bbc.name }
                }, {
                    ...getFields(incredibles),
                    studio: { _id: incredibles.studio, name: pixar.name }
                }]);
            });
    });

    it('gets a film by id, populating studio, actors, and reviewers with names', () => {
        let thumbUp = {
            rating: 4,
            review: 'It is cheerful from beginning to end.',
            film: ado._id,
        };

        return request.post('/reviews')
            .set('Authorization', token)            
            .send(thumbUp)
            .then(checkOk)
            .then(({ body }) => {
                thumbUp = body;
                return request.get(`/films/${ado._id}`);
            })
            .then(({ body }) => {
                assert.deepEqual(body, {
                    ...ado,
                    studio: { _id: ado.studio, name: bbc.name },
                    cast: [{
                        _id: castMember._id,
                        actor: { _id: castMember.actor, name: emma.name }
                    }],
                    reviews: [{
                        _id: thumbUp._id,
                        rating: thumbUp.rating,
                        review: thumbUp.review,
                        reviewer: { _id: ebert._id, name: ebert.name }
                    }]
                });
            });
    });

    it('deletes film by id', () => {
        return request.delete(`/films/${incredibles._id}`)
            .then(() => {
                return request.get(`/films/${incredibles._id}`);
            })
            .then(res => {
                assert.equal(res.status, 404);
            });
    });

});