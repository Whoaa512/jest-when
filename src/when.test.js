const { stringContaining } = expect

const errMsg = ({ expect, actual }) =>
  new RegExp(`Expected.*\\n.*${expect}.*\\nReceived.*\\n.*${actual}`)

describe('When', () => {
  let spyEquals, when, WhenMock, mockLogger

  beforeEach(() => {
    spyEquals = jest.spyOn(require('expect/build/jasmine_utils'), 'equals')

    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      trace: jest.fn()
    }

    jest.mock('./log', () => () => mockLogger)

    when = require('./when').when
    WhenMock = require('./when').WhenMock
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.resetModules()
  })

  describe('when', () => {
    it('returns a WhenMock', () => {
      const fn = jest.fn()
      const whenFn = when(fn)

      expect(whenFn).toBeInstanceOf(WhenMock)
      expect(whenFn.fn).toBe(fn)
    })

    it('returns existing WhenMock if fn was already whenified', () => {
      const fn = jest.fn()
      const whenFn1 = when(fn)
      const whenFn2 = when(fn)

      expect(whenFn1).toBeInstanceOf(WhenMock)
      expect(whenFn2).toBeInstanceOf(WhenMock)
      expect(whenFn1).toBe(whenFn2)
    })
  })

  describe('mock implementation', () => {
    it('offloads equality check to jasmine equals helper', () => {
      const fn = jest.fn()

      when(fn).calledWith(1).mockReturnValue('x')

      expect(fn(1)).toEqual('x')
      expect(spyEquals).toBeCalledWith(1, 1)

      expect(fn(2)).toEqual(undefined)
      expect(spyEquals).toBeCalledWith(2, 1)
    })

    it('works with multiple args', () => {
      const fn = jest.fn()

      const anyString = expect.any(String)

      when(fn)
        .calledWith(1, 'foo', true, anyString, undefined)
        .mockReturnValue('x')

      expect(fn(1, 'foo', true, 'whatever')).toEqual('x')
      expect(spyEquals).toBeCalledWith(1, 1)
      expect(spyEquals).toBeCalledWith('foo', 'foo')
      expect(spyEquals).toBeCalledWith(true, true)
      expect(spyEquals).toBeCalledWith('whatever', anyString)
      expect(spyEquals).toBeCalledWith(undefined, undefined)
    })

    it('supports compound when declarations', () => {
      const fn = jest.fn()

      when(fn).calledWith(1).mockReturnValue('x')
      when(fn).calledWith('foo', 'bar').mockReturnValue('y')
      when(fn).calledWith(false, /asdf/g).mockReturnValue('z')

      expect(fn(1)).toEqual('x')
      expect(fn('foo', 'bar')).toEqual('y')
      expect(fn(false, /asdf/g)).toEqual('z')
    })

    it('supports chaining of when declarations', () => {
      const fn = jest.fn()

      when(fn)
        .calledWith(1)
        .mockReturnValue('x')

      when(fn).calledWith('foo', 'bar')
        .mockReturnValue('y')
        .calledWith(false, /asdf/g)
        .mockReturnValue('z')

      expect(fn(1)).toEqual('x')
      expect(fn('foo', 'bar')).toEqual('y')
      expect(fn(false, /asdf/g)).toEqual('z')
    })

    it('supports replacement of when declarations', () => {
      const fn = jest.fn()

      when(fn).calledWith('foo', 'bar').mockReturnValue('x')
      when(fn).calledWith(false, /asdf/g).mockReturnValue('y')
      when(fn).calledWith('foo', 'bar').mockReturnValue('z')

      expect(fn('foo', 'bar')).toEqual('z')
    })

    it('returns a declared value repeatedly', () => {
      const fn = jest.fn()

      when(fn).calledWith(1).mockReturnValue('x')
      when(fn).calledWith(2).mockReturnValueOnce('x').mockReturnValue('y')

      expect(fn(1)).toEqual('x')
      expect(fn(1)).toEqual('x')
      expect(fn(1)).toEqual('x')
      expect(fn(2)).toEqual('x')
      expect(fn(2)).toEqual('y')
    })

    it('returns nothing if no declared value matches', () => {
      const fn = jest.fn()

      when(fn).calledWith(1, 2).mockReturnValue('x')

      expect(fn(5, 6)).toBeUndefined()
      expect(mockLogger.debug).toBeCalledWith(stringContaining('matcher: 1'))
      expect(mockLogger.debug).not.toBeCalledWith(stringContaining('matcher: 2'))
    })

    it('expectCalledWith: fails a test with error messaging if argument does not match', () => {
      const fn1 = jest.fn()
      const fn2 = jest.fn()

      when(fn1).expectCalledWith(1).mockReturnValue('x')
      when(fn2).calledWith('foo').mockReturnValue('y')

      expect(() => fn1(2)).toThrow(errMsg({ expect: 1, actual: 2 }))
      expect(() => fn2('bar')).not.toThrow()
    })

    it('mockReturnValueOnce: should return specified value only once', () => {
      const fn = jest.fn()

      when(fn).calledWith('foo').mockReturnValueOnce('bar')
      when(fn).calledWith('foo').mockReturnValueOnce('cbs')

      expect(fn('foo')).toEqual('bar')
      expect(fn('foo')).toEqual('cbs')
      expect(fn('foo')).toBeUndefined()
    })

    it('mockReturnValueOnce: should return specified value only once and the regular value after that', () => {
      const fn = jest.fn()

      when(fn).calledWith('foo').mockReturnValue('bar')
      expect(fn('foo')).toEqual('bar')

      when(fn).calledWith('foo').mockReturnValueOnce('cbs')
      expect(fn('foo')).toEqual('cbs')

      expect(fn('foo')).toEqual('bar')
    })

    it('mockReturnValueOnce: works with expectCalledWith', () => {
      const fn = jest.fn()

      when(fn).expectCalledWith('foo').mockReturnValueOnce('bar')

      expect(fn('foo')).toEqual('bar')
    })

    it('mockResolvedValue: should return a Promise', async () => {
      const fn = jest.fn()

      when(fn).calledWith('foo').mockResolvedValue('bar')

      await expect(fn('foo')).resolves.toEqual('bar')
    })

    it('mockResolvedValue: works with expectCalledWith', async () => {
      const fn = jest.fn()

      when(fn).expectCalledWith('foo').mockResolvedValue('bar')

      await expect(fn('foo')).resolves.toEqual('bar')
    })

    it('mockResolvedValueOnce: should return a Promise only once', async () => {
      const fn = jest.fn()

      when(fn).calledWith('foo').mockResolvedValueOnce('bar')

      await expect(fn('foo')).resolves.toEqual('bar')
      expect(await fn('foo')).toBeUndefined()
    })

    it('mockResolvedValueOnce: should return specified value only once and the regular value after that', async () => {
      const fn = jest.fn()

      when(fn).calledWith('foo').mockResolvedValue('bar')
      expect(await fn('foo')).toEqual('bar')

      when(fn).calledWith('foo').mockResolvedValueOnce('cbs')
      expect(await fn('foo')).toEqual('cbs')

      expect(await fn('foo')).toEqual('bar')
    })

    it('mockResolvedValueOnce: works with expectCalledWith', async () => {
      const fn = jest.fn()

      when(fn).expectCalledWith('foo').mockResolvedValueOnce('bar')

      await expect(fn('foo')).resolves.toEqual('bar')
      expect(await fn('foo')).toBeUndefined()
    })

    it('mockRejectedValue: should return a rejected Promise', async () => {
      const fn = jest.fn()

      when(fn).calledWith('foo').mockRejectedValue(new Error('bar'))

      await expect(fn('foo')).rejects.toThrow('bar')
    })

    it('mockRejectedValue: works with expectCalledWith', async () => {
      const fn = jest.fn()

      when(fn).expectCalledWith('foo').mockRejectedValue(new Error('bar'))

      await expect(fn('foo')).rejects.toThrow('bar')
    })

    it('mockRejectedValueOnce: should return a rejected Promise only once', async () => {
      const fn = jest.fn()

      when(fn).calledWith('foo').mockRejectedValueOnce(new Error('bar'))

      await expect(fn('foo')).rejects.toThrow('bar')
      expect(await fn('foo')).toBeUndefined()
    })

    it('mockRejectedValueOnce: works with expectCalledWith', async () => {
      const fn = jest.fn()

      when(fn).expectCalledWith('foo').mockRejectedValueOnce(new Error('bar'))

      await expect(fn('foo')).rejects.toThrow('bar')
      expect(await fn('foo')).toBeUndefined()
    })

    it('can be reset via `mockReset`', () => {
      const fn = jest.fn()

      when(fn).calledWith(1).mockReturnValue('return 1')
      expect(fn(1)).toEqual('return 1')

      fn.mockReset()
      expect(fn(1)).toBeUndefined()

      when(fn).calledWith(1).mockReturnValue('return 2')
      expect(fn(1)).toEqual('return 2')
    })

    it('has a default and a non-default behavior', () => {
      const fn = jest.fn()

      when(fn)
        .mockReturnValue('default')
        .calledWith('foo')
        .mockReturnValue('special')

      expect(fn('bar')).toEqual('default')
      expect(fn('foo')).toEqual('special')
      expect(fn('bar')).toEqual('default')
    })

    it('has a default which is falsy', () => {
      const fn = jest.fn()

      when(fn)
        .mockReturnValue(false)
        .calledWith('foo')
        .mockReturnValue('special')

      expect(fn('bar')).toEqual(false)
      expect(fn('foo')).toEqual('special')
      expect(fn('bar')).toEqual(false)
    })

    it('keeps the default with a lot of matchers', () => {
      const fn = jest.fn()

      when(fn)
        .mockReturnValue('default')
        .calledWith('in1').mockReturnValue('out1')
        .calledWith('in2').mockReturnValue('out2')
        .calledWith('in3').mockReturnValue('out3')
        .calledWith('in4').mockReturnValueOnce('out4')

      expect(fn('foo')).toEqual('default')
      expect(fn('in2')).toEqual('out2')
      expect(fn('in4')).toEqual('out4')
      expect(fn('in1')).toEqual('out1')
      expect(fn('in3')).toEqual('out3')
      expect(fn('in4')).toEqual('default')
    })

    it('has a default and non-default resolved value', async () => {
      const fn = jest.fn()

      when(fn)
        .mockResolvedValue('default')
        .calledWith('foo').mockResolvedValue('special')

      await expect(fn('bar')).resolves.toEqual('default')
      await expect(fn('foo')).resolves.toEqual('special')
    })

    it('has a default and non-default rejected value', async () => {
      const fn = jest.fn()

      when(fn)
        .mockRejectedValue(new Error('default'))
        .calledWith('foo').mockRejectedValue(new Error('special'))

      await expect(fn('bar')).rejects.toThrow('default')
      await expect(fn('foo')).rejects.toThrow('special')
    })

    it('default reject interoperates with resolve', async () => {
      const fn = jest.fn()

      when(fn)
        .mockRejectedValue(new Error('non-mocked interaction'))
        .calledWith('foo').mockResolvedValue('mocked')

      await expect(fn('foo')).resolves.toEqual('mocked')
      await expect(fn('bar')).rejects.toThrow('non-mocked interaction')
    })

    it('can override default', () => {
      const fn = jest.fn()

      when(fn)
        .mockReturnValue('oldDefault')
        .mockReturnValue('newDefault')
        .calledWith('foo').mockReturnValue('bar')

      expect(fn('foo')).toEqual('bar')
      expect(fn('foo2')).toEqual('newDefault')
    })

    it('will throw because of unintended usage', () => {
      const fn = jest.fn()

      when(fn)
        .mockReturnValue('default')

      expect(fn).toThrow('Uninteded use: Only use default value in combination with .calledWith(..), ' +
        'or use standard mocking without jest-when.')
    })

    it('will not throw on old non-throwing case', () => {
      const fn = jest.fn()

      when(fn)

      expect(fn).not.toThrow()
    })

    it('allows using mockImplementation', () => {
      const fn = jest.fn()

      when(fn).calledWith('foo', 'bar').mockImplementation((...args) => args)

      expect(fn('foo', 'bar')).toEqual(['foo', 'bar'])
      expect(fn('foo', 'bar')).toEqual(['foo', 'bar'])

      expect(fn('not-foo')).toBeUndefined()
    })

    it('allows using mockImplementationOnce', () => {
      const fn = jest.fn()

      when(fn).calledWith('foo', 'bar').mockImplementationOnce((...args) => args)

      expect(fn('foo', 'bar')).toEqual(['foo', 'bar'])
      expect(fn('foo')).toBeUndefined()
    })
  })
})
